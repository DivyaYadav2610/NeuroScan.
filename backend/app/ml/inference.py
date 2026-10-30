# app/ml/inference.py
import numpy as np
import tensorflow as tf
import pywt, pyedflib
from pathlib import Path
from scipy import signal

from app.ml.channels import CHANNELS_23, get_channel_mapping

FS = 256
WINDOW_SECONDS  = 4
WINDOW_SAMPLES  = FS * WINDOW_SECONDS          # 1024
OVERLAP_PERCENT = 25
STEP_SAMPLES    = int(WINDOW_SECONDS * (1 - OVERLAP_PERCENT/100) * FS)  # 768
SLICE_SAMPLES   = 128
NUM_SLICES      = 8
N_CHANNELS      = 23
FEATURES_PER_SLICE = 69
WAVELET   = "coif1"
LEVEL     = 5
NOTCH_FREQUENCY = 60.0
NOTCH_Q         = 30.0

# Loaded once at startup
_model      = None
_threshold  = None
_norm_mean  = None
_norm_std   = None


def load_artifacts(model_path, threshold_path, norm_path):
    global _model, _threshold, _norm_mean, _norm_std
    _model = tf.keras.models.load_model(str(model_path))
    _threshold = float(np.load(str(threshold_path))[0])
    norm = np.load(str(norm_path))
    _norm_mean = norm["mean"]
    _norm_std  = norm["std"]
    print(f"[inference] model loaded, threshold = {_threshold:.4f}")


def _reconstruct_detail(sig, lvl):
    coeffs = pywt.wavedec(sig, WAVELET, level=LEVEL)
    idx = LEVEL - lvl + 1
    sel = [np.zeros_like(c) for c in coeffs]
    sel[idx] = coeffs[idx]
    rec = pywt.waverec(sel, WAVELET)[:len(sig)]
    return rec.astype(np.float32)


def _log_energy(d3, d4, d5):
    eps = 1e-12
    e3 = np.sum(np.square(d3, dtype=np.float64))
    e4 = np.sum(np.square(d4, dtype=np.float64))
    e5 = np.sum(np.square(d5, dtype=np.float64))
    return np.array([np.log10(e3+eps), np.log10(e4+eps), np.log10(e5+eps)],
                    dtype=np.float32)


def _apply_notch(data):
    b, a = signal.iirnotch(NOTCH_FREQUENCY, NOTCH_Q, fs=FS)
    return signal.filtfilt(b, a, data, axis=1).astype(np.float32)


def extract_epoch_features(epoch):
    """(23, 1024) -> (8, 69)"""
    fm = np.zeros((NUM_SLICES, FEATURES_PER_SLICE), dtype=np.float32)
    for ch in range(N_CHANNELS):
        sig = epoch[ch].astype(np.float64)
        d3 = _reconstruct_detail(sig, 3)
        d4 = _reconstruct_detail(sig, 4)
        d5 = _reconstruct_detail(sig, 5)
        for s in range(NUM_SLICES):
            a, b = s*SLICE_SAMPLES, (s+1)*SLICE_SAMPLES
            fm[s, ch*3:ch*3+3] = _log_energy(d3[a:b], d4[a:b], d5[a:b])
    return fm


def _standardize_channels(reader, channel_mapping):
    std, real = [], []
    for ch in CHANNELS_23:
        idx = channel_mapping.get(ch)
        if idx is None:
            std.append(None)
        else:
            s = reader.readSignal(idx).astype(np.float32)
            std.append(s); real.append(s)
    if real:
        fill = np.mean(real, axis=0).astype(np.float32)
    else:
        fill = np.zeros(reader.getNSamples()[0], dtype=np.float32)
    for i in range(len(std)):
        if std[i] is None:
            std[i] = fill.copy()
    return np.vstack(std).astype(np.float32)


def predict_edf(edf_path: str):
    assert _model is not None, "Call load_artifacts() first"

    with pyedflib.EdfReader(str(edf_path)) as r:
        raw_names = r.getSignalLabels()
        mapping, missing, extra, diff = get_channel_mapping(raw_names)
        if diff:
            raise ValueError("EDF uses unsupported montage")
        data = _standardize_channels(r, mapping)
        total = data.shape[1]
        duration = total / FS

    data = _apply_notch(data)

    windows, probs = [], []
    for start in range(0, total - WINDOW_SAMPLES + 1, STEP_SAMPLES):
        end = start + WINDOW_SAMPLES
        epoch = data[:, start:end]
        if epoch.shape != (N_CHANNELS, WINDOW_SAMPLES):
            continue

        feats = extract_epoch_features(epoch).reshape(1, -1)
        feats = (feats - _norm_mean) / _norm_std
        feats = feats.reshape(1, NUM_SLICES, FEATURES_PER_SLICE)

        p = float(_model.predict(feats, verbose=0)[0, 0])
        probs.append(p)
        windows.append({
            "start_sec": start / FS,
            "end_sec":   end   / FS,
            "prob":      p,
            "label":     int(p >= _threshold),
        })

    probs_arr = np.asarray(probs, dtype=np.float32)
    if len(probs_arr) >= 5:
        kernel = np.ones(5, dtype=np.float32) / 5.0
        smoothed = np.convolve(probs_arr, kernel, mode="same")
    else:
        smoothed = probs_arr

    labels = (smoothed >= _threshold).astype(int)

    events = []
    cur_start = None
    for i, lab in enumerate(labels):
        if lab == 1 and cur_start is None:
            cur_start = windows[i]["start_sec"]
        elif lab == 0 and cur_start is not None:
            events.append((cur_start, windows[i-1]["end_sec"]))
            cur_start = None
    if cur_start is not None:
        events.append((cur_start, windows[-1]["end_sec"]))

    merged = []
    for s, e in events:
        if merged and (s - merged[-1][1]) < 60:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))

    return {
        "file": Path(edf_path).name,
        "duration_sec": duration,
        "windows": windows,
        "smoothed_probs": smoothed.tolist(),
        "seizure_events": merged,
        "n_seizures": len(merged),
        "mean_prob": float(probs_arr.mean()) if len(probs_arr) else 0.0,
        "threshold": _threshold,
    }