# app/ml/prepare_data.py
from pathlib import Path
import re, gc
import numpy as np
import pyedflib, pywt
from scipy import signal

PATIENT = "chb01"
DATASET_PATH = Path("D:/NeuroSense/NeuroSense/backend/data/chbmit_Final")
PATIENT_PATH = DATASET_PATH / PATIENT
OUTPUT_PATH  = Path("D:/NeuroSense/NeuroSense/backend/processed")
OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

FS = 256
WINDOW_SECONDS = 4
WINDOW_SAMPLES = FS * WINDOW_SECONDS
OVERLAP_PERCENT = 25
STEP_SAMPLES = int(WINDOW_SECONDS * (1 - OVERLAP_PERCENT/100) * FS)
SLICE_SECONDS = 0.5
SLICE_SAMPLES = int(SLICE_SECONDS * FS)
NUM_SLICES = int(WINDOW_SECONDS / SLICE_SECONDS)
N_CHANNELS = 23
FEATURES_PER_SLICE = N_CHANNELS * 3

WAVELET = "coif1"
LEVEL = 5
NOTCH_FREQUENCY = 60.0
NOTCH_Q = 30.0

CHANNELS_23 = [
    "FP1-F7","F7-T7","T7-P7","P7-O1",
    "FP1-F3","F3-C3","C3-P3","P3-O1",
    "FP2-F4","F4-C4","C4-P4","P4-O2",
    "FP2-F8","F8-T8","T8-P8-0","P8-O2",
    "FZ-CZ","CZ-PZ","P7-T7","T7-FT9",
    "FT9-FT10","FT10-T8","T8-P8-1",
]

def canon(name):
    n = str(name).strip().upper().replace(" ", "")
    if n.startswith("--") or n.startswith(".-"):
        return "DUMMY"
    if n == "01": return "O1"
    if n == "T8-P8": return "T8-P8-0"
    return n

def get_mapping(raw_names):
    idx_map, used = {}, set()
    for i, r in enumerate(raw_names):
        c = canon(r)
        if c == "DUMMY" or c not in CHANNELS_23:
            continue
        if c not in idx_map:
            idx_map[c] = i
            used.add(i)
    mapping = {ch: idx_map.get(ch) for ch in CHANNELS_23}
    missing = [ch for ch, v in mapping.items() if v is None]
    return mapping, missing, len(idx_map)

def reconstruct(sig, lvl):
    c = pywt.wavedec(sig, WAVELET, level=LEVEL)
    i = LEVEL - lvl + 1
    sel = [np.zeros_like(x) for x in c]
    sel[i] = c[i]
    return pywt.waverec(sel, WAVELET)[:len(sig)].astype(np.float32)

def log_energy(d3, d4, d5):
    eps = 1e-12
    return np.array([
        np.log10(np.sum(np.square(d3, dtype=np.float64)) + eps),
        np.log10(np.sum(np.square(d4, dtype=np.float64)) + eps),
        np.log10(np.sum(np.square(d5, dtype=np.float64)) + eps),
    ], dtype=np.float32)

def features_from_epoch(epoch):
    fm = np.zeros((NUM_SLICES, FEATURES_PER_SLICE), dtype=np.float32)
    for ch in range(N_CHANNELS):
        s = epoch[ch].astype(np.float64)
        d3 = reconstruct(s, 3)
        d4 = reconstruct(s, 4)
        d5 = reconstruct(s, 5)
        for k in range(NUM_SLICES):
            a, b = k*SLICE_SAMPLES, (k+1)*SLICE_SAMPLES
            fm[k, ch*3:ch*3+3] = log_energy(d3[a:b], d4[a:b], d5[a:b])
    return fm

def notch(data):
    b, a = signal.iirnotch(NOTCH_FREQUENCY, NOTCH_Q, fs=FS)
    return signal.filtfilt(b, a, data, axis=1).astype(np.float32)

def parse_summary(path):
    text = path.read_text(errors="ignore")
    info, cur, pending = {}, None, None
    for raw in text.splitlines():
        line = raw.strip()
        m = re.match(r"File Name:\s*(.+)", line, re.IGNORECASE)
        if m:
            cur = m.group(1).strip()
            info[cur] = {"seizures": []}
            pending = None
            continue
        if cur is None: continue
        sm = re.search(r"Seizure(?:\s+\d+)?\s+Start\s+Time\s*:\s*([0-9.]+)",
                       line, re.IGNORECASE)
        if sm:
            pending = float(sm.group(1)); continue
        em = re.search(r"Seizure(?:\s+\d+)?\s+End\s+Time\s*:\s*([0-9.]+)",
                       line, re.IGNORECASE)
        if em and pending is not None:
            info[cur]["seizures"].append((pending, float(em.group(1))))
            pending = None
    return info

if not PATIENT_PATH.exists():
    raise SystemExit(f"Patient folder not found: {PATIENT_PATH}")

edf_files = sorted(PATIENT_PATH.glob("*.edf"))
summary = parse_summary(PATIENT_PATH / f"{PATIENT}-summary.txt")

print(f"Found {len(edf_files)} EDF files")

all_X, all_y, all_fids, all_start, all_end = [], [], [], [], []

for edf in edf_files:
    fname = edf.name
    if fname not in summary:
        print(f"Skip (no summary): {fname}"); continue
    seizures = summary[fname]["seizures"]

    with pyedflib.EdfReader(str(edf)) as r:
        raw = r.getSignalLabels()
        mapping, missing, n_found = get_mapping(raw)
        if n_found < 21:
            print(f"Skip (montage): {fname}"); continue

        real_idx = [i for i in mapping.values() if i is not None]
        srs = np.array([r.getSampleFrequency(i) for i in real_idx])
        if not np.allclose(srs, FS):
            print(f"Skip (fs): {fname}"); continue

        ns = np.array([r.getNSamples()[i] for i in real_idx])
        if not np.all(ns == ns[0]):
            print(f"Skip (lengths): {fname}"); continue
        total = int(ns[0])

        chans, real = [], []
        for ch in CHANNELS_23:
            i = mapping[ch]
            if i is None:
                chans.append(None)
            else:
                s = r.readSignal(i).astype(np.float32)
                chans.append(s); real.append(s)
        fill = np.mean(real, axis=0).astype(np.float32)
        for k in range(len(chans)):
            if chans[k] is None:
                chans[k] = fill.copy()
        data = np.vstack(chans).astype(np.float32)

    data = notch(data)

    if total < WINDOW_SAMPLES:
        print(f"Skip (short): {fname}"); continue

    X_f, y_f, s_f, e_f = [], [], [], []
    for start in range(0, total - WINDOW_SAMPLES + 1, STEP_SAMPLES):
        end = start + WINDOW_SAMPLES
        epoch = data[:, start:end]
        if epoch.shape != (N_CHANNELS, WINDOW_SAMPLES): continue

        feats = features_from_epoch(epoch)
        s_sec, e_sec = start/FS, end/FS
        label = int(any(s_sec < se and e_sec > ss for ss, se in seizures))

        X_f.append(feats); y_f.append(label)
        s_f.append(s_sec); e_f.append(e_sec)

    all_X.append(np.asarray(X_f, dtype=np.float32))
    all_y.append(np.asarray(y_f, dtype=np.int8))
    all_fids.extend([fname] * len(y_f))
    all_start.extend(s_f); all_end.extend(e_f)
    print(f"Done: {fname}  windows={len(y_f)}  pos={sum(y_f)}")
    del data; gc.collect()

X = np.concatenate(all_X, axis=0)
y = np.concatenate(all_y, axis=0)
file_ids = np.asarray(all_fids)
seq_start = np.asarray(all_start, dtype=np.float32)
seq_end   = np.asarray(all_end, dtype=np.float32)

print(f"\nTotal X: {X.shape}, pos: {int(y.sum())}")

RNG = np.random.default_rng(42)
files = np.unique(file_ids); RNG.shuffle(files)
n = len(files)
n_train = int(n * 0.70); n_val = int(n * 0.15)
tr = set(files[:n_train]); va = set(files[n_train:n_train+n_val]); te = set(files[n_train+n_val:])
tr_m = np.array([f in tr for f in file_ids])
va_m = np.array([f in va for f in file_ids])
te_m = np.array([f in te for f in file_ids])

X_flat = X.reshape(len(X), -1).astype(np.float32)
mean = X_flat[tr_m].mean(axis=0, keepdims=True)
std  = X_flat[tr_m].std(axis=0, keepdims=True)
std  = np.where(std < 1e-6, 1.0, std)
X_norm = ((X_flat - mean) / std).reshape(X.shape).astype(np.float32)

np.savez_compressed(
    OUTPUT_PATH / f"{PATIENT}_features_split.npz",
    X_train=X_norm[tr_m], y_train=y[tr_m].astype(np.int8), file_ids_train=file_ids[tr_m],
    X_val=X_norm[va_m],   y_val=y[va_m].astype(np.int8),   file_ids_val=file_ids[va_m],
    X_test=X_norm[te_m],  y_test=y[te_m].astype(np.int8),  file_ids_test=file_ids[te_m],
    mean=mean.astype(np.float32), std=std.astype(np.float32),
)
np.savez_compressed(
    OUTPUT_PATH / f"{PATIENT}_norm_stats.npz",
    mean=mean.astype(np.float32), std=std.astype(np.float32),
)

print(f"\n✅ Saved to {OUTPUT_PATH}")
print(f"   - {PATIENT}_features_split.npz")
print(f"   - {PATIENT}_norm_stats.npz")