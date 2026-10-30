import torch
import torch.nn as nn
import numpy as np
import json
import os
import pyedflib
import pywt
import math
import torch.nn.functional as F
from einops import rearrange, repeat
from scipy import signal

# --- CONFIG FROM YOUR NOTEBOOK ---
FS = 256
WINDOW_SECONDS = 4
WINDOW_SAMPLES = FS * WINDOW_SECONDS
SLICE_SAMPLES = int(0.5 * FS)
NUM_SLICES = 8
WAVELET = "coif1"
LEVEL = 5

# ============================================================
# PURE PYTORCH MAMBA BLOCK (Replaces mamba_ssm)
# ============================================================
class MambaBlock(nn.Module):
    def __init__(self, d_model, d_state=16, d_conv=4, expand=2):
        super().__init__()
        self.d_model = d_model
        self.d_state = d_state
        self.d_conv = d_conv
        self.expand = expand
        self.d_inner = int(self.expand * self.d_model)
        self.dt_rank = math.ceil(self.d_model / 16)

        self.in_proj = nn.Linear(self.d_model, self.d_inner * 2, bias=False)
        self.conv1d = nn.Conv1d(self.d_inner, self.d_inner, kernel_size=self.d_conv, padding=self.d_conv - 1, groups=self.d_inner, bias=True)
        self.x_proj = nn.Linear(self.d_inner, self.dt_rank + self.d_state * 2, bias=False)
        self.dt_proj = nn.Linear(self.dt_rank, self.d_inner, bias=True)

        A = repeat(torch.arange(1, self.d_state + 1, dtype=torch.float32), 'n -> d n', d=self.d_inner)
        self.A_log = nn.Parameter(torch.log(A))
        self.D = nn.Parameter(torch.ones(self.d_inner))
        self.out_proj = nn.Linear(self.d_inner, self.d_model, bias=False)

    def forward(self, x):
        B, L, D = x.shape
        x_and_res = self.in_proj(x)
        x, res = x_and_res.split(self.d_inner, dim=-1)
        x = rearrange(x, 'b l d -> b d l')
        x = self.conv1d(x)[..., :L]
        x = rearrange(x, 'b d l -> b l d')
        x = F.silu(x)
        y = x * torch.sigmoid(x) * self.D
        y = y * F.silu(res)
        return self.out_proj(y)

# 1. Strict Mamba Architecture
class MambaClassifier(nn.Module):
    def __init__(self, n_features=69, hidden=64, num_layers=2, dropout=0.3, d_state=16, d_conv=4, expand=2):
        super().__init__()
        self.input_proj = nn.Sequential(nn.Linear(n_features, hidden), nn.LayerNorm(hidden), nn.ReLU())
        # NOW USES MambaBlock INSTEAD OF Mamba
        self.blocks = nn.ModuleList([MambaBlock(d_model=hidden, d_state=d_state, d_conv=d_conv, expand=expand) for _ in range(num_layers)])
        self.norms = nn.ModuleList([nn.LayerNorm(hidden) for _ in range(num_layers)])
        self.dropout = nn.Dropout(dropout)
        self.attn1 = nn.Linear(hidden, 1)
        self.attn2 = nn.Linear(hidden, 1)
        self.res_proj = nn.Linear(hidden, hidden)
        self.head = nn.Sequential(nn.Linear(hidden, hidden), nn.ReLU(), nn.Dropout(dropout), nn.Linear(hidden, 1))

    def forward(self, x):
        h = self.input_proj(x)
        for blk, ln in zip(self.blocks, self.norms):
            h = h + self.dropout(blk(ln(h)))
        out = h
        w1 = torch.softmax(self.attn1(out), dim=1)
        w2 = torch.softmax(self.attn2(out), dim=1)
        pooled = (out * w1).sum(1) + (out * w2).sum(1)
        last   = out[:, -1, :]
        pooled = pooled + self.res_proj(last)
        return self.head(pooled).squeeze(-1)

# 2. Feature Extraction (From your Jupyter notebook)
def reconstruct_detail(signal_data, detail_level):
    signal_data = np.asarray(signal_data, dtype=np.float64)
    coeffs = pywt.wavedec(signal_data, WAVELET, level=LEVEL)
    detail_index = LEVEL - detail_level + 1
    selected = [np.zeros_like(c) for c in coeffs]
    selected[detail_index] = coeffs[detail_index]
    reconstructed = pywt.waverec(selected, WAVELET)
    return reconstructed[:len(signal_data)].astype(np.float32)

def relative_energy(d3, d4, d5):
    eps = 1e-12
    e3 = np.sum(np.square(d3, dtype=np.float64))
    e4 = np.sum(np.square(d4, dtype=np.float64))
    e5 = np.sum(np.square(d5, dtype=np.float64))
    return np.array([np.log10(e3 + eps), np.log10(e4 + eps), np.log10(e5 + eps)], dtype=np.float32)

def extract_epoch_features(epoch):
    feature_matrix = np.zeros((NUM_SLICES, 69), dtype=np.float32)
    for ch in range(23):
        if ch >= epoch.shape[0]: break
        sig = epoch[ch].astype(np.float64)
        d3 = reconstruct_detail(sig, 3)
        d4 = reconstruct_detail(sig, 4)
        d5 = reconstruct_detail(sig, 5)
        for slice_idx in range(NUM_SLICES):
            start = slice_idx * SLICE_SAMPLES
            end = start + SLICE_SAMPLES
            features = relative_energy(d3[start:end], d4[start:end], d5[start:end])
            f_start = ch * 3
            feature_matrix[slice_idx, f_start:f_start+3] = features
    return feature_matrix

# 3. Main Inference for Uploaded EDF
def analyze_uploaded_edf(edf_path, patient_id="chb01"):
    base_path = os.path.join(os.path.dirname(__file__), "model_assets")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load Model
    model = MambaClassifier().to(device)
    model_path = os.path.join(base_path, "chb01_best.pt") 
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    
    # Load Thresholds
    with open(os.path.join(base_path, "best_thresholds.json"), "r") as f:
        thresholds = json.load(f)
    config = thresholds['per_patient'].get(patient_id, {"smooth": 1, "thr": 0.35})

    # Read EDF and Preprocess
    with pyedflib.EdfReader(str(edf_path)) as reader:
        n_samples = WINDOW_SAMPLES
        data = []
        for i in range(min(23, reader.signals_in_file)):
            data.append(reader.readSignal(i)[:n_samples])
        data = np.vstack(data).astype(np.float32)
        
        # Apply notch filter
        b, a = signal.iirnotch(w0=60.0, Q=30.0, fs=FS)
        data = signal.filtfilt(b, a, data, axis=1).astype(np.float32)
    
    # Extract Features (8 x 69)
    features = extract_epoch_features(data)
    
    # Run Mamba
    X_tensor = torch.tensor(np.clip(features, -5, 5)).unsqueeze(0).to(device) 
    with torch.no_grad():
        logit = model(X_tensor)
        prob = torch.sigmoid(logit).item()
    
    # Return JSON for React
    return {
        "status": "success",
        "probability": prob,
        "is_seizure": int(prob >= config['thr']),
        "threshold": config['thr'],
        "features": features.tolist()
    }