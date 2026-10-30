# app/ml/channels.py
import numpy as np

CHANNELS_23 = [
    "FP1-F7", "F7-T7", "T7-P7", "P7-O1",
    "FP1-F3", "F3-C3", "C3-P3", "P3-O1",
    "FP2-F4", "F4-C4", "C4-P4", "P4-O2",
    "FP2-F8", "F8-T8", "T8-P8-0", "P8-O2",
    "FZ-CZ", "CZ-PZ", "P7-T7", "T7-FT9",
    "FT9-FT10", "FT10-T8", "T8-P8-1",
]

def normalize_channel_name(name):
    return str(name).strip().upper().replace(" ", "")

def canonicalize_channel_name(name):
    name = normalize_channel_name(name)
    if name.startswith("--") or name.startswith(".-"):
        return "DUMMY"
    if name == "01":
        return "O1"
    if name == "T8-P8":
        return "T8-P8-0"
    return name

def get_channel_mapping(raw_names):
    canonical_to_index = {}
    used = set()
    for idx, raw in enumerate(raw_names):
        c = canonicalize_channel_name(raw)
        if c == "DUMMY" or c not in CHANNELS_23:
            continue
        if c not in canonical_to_index:
            canonical_to_index[c] = idx
            used.add(idx)

    mapping, missing = {}, []
    for ch in CHANNELS_23:
        if ch in canonical_to_index:
            mapping[ch] = canonical_to_index[ch]
        else:
            mapping[ch] = None
            missing.append(ch)

    extra = [raw_names[i] for i in range(len(raw_names)) if i not in used]
    different_montage = len(canonical_to_index) < 21
    return mapping, missing, extra, different_montage