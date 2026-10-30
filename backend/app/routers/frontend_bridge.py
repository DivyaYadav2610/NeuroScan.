# backend/app/routers/frontend_bridge.py
"""
Bridge endpoint for the existing frontend.
Frontend calls: POST /analyze  (with form-data fields: file, patient_name, patient_id, age, gender, description)
Response shape: { channels, original_signal, coif1_d3/4/5, feature_matrix, prediction, confidence, ... }

This file does NOT modify any existing code.
It reuses app.ml.inference for the model + wavelet pipeline.
"""
import shutil, uuid
import numpy as np
import pywt, pyedflib
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
from scipy import signal

from app.ml.channels import CHANNELS_23, get_channel_mapping
import app.ml.inference as inf

router = APIRouter(tags=["frontend-bridge"])

BASE = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

FS = inf.FS
WINDOW_SAMPLES = inf.WINDOW_SAMPLES      # 1024
WINDOW_SECONDS = inf.WINDOW_SECONDS      # 4
N_CHANNELS = inf.N_CHANNELS              # 23
WAVELET = inf.WAVELET                    # coif1
LEVEL = inf.LEVEL                        # 5
NOTCH_FREQUENCY = inf.NOTCH_FREQUENCY
NOTCH_Q = inf.NOTCH_Q


def _notch(data):
    b, a = signal.iirnotch(NOTCH_FREQUENCY, NOTCH_Q, fs=FS)
    return signal.filtfilt(b, a, data, axis=1).astype(np.float32)


def _reconstruct_detail(sig, lvl):
    """Reconstruct one wavelet detail level (identical to inference.py)."""
    coeffs = pywt.wavedec(sig, WAVELET, level=LEVEL)
    idx = LEVEL - lvl + 1
    sel = [np.zeros_like(c) for c in coeffs]
    sel[idx] = coeffs[idx]
    rec = pywt.waverec(sel, WAVELET)[:len(sig)]
    return rec.astype(np.float32)


def _standardize(reader, mapping):
    """Fill missing channels with mean of real ones (identical to inference.py)."""
    std, real = [], []
    for ch in CHANNELS_23:
        i = mapping.get(ch)
        if i is None:
            std.append(None)
        else:
            s = reader.readSignal(i).astype(np.float32)
            std.append(s); real.append(s)
    fill = np.mean(real, axis=0).astype(np.float32) if real else np.zeros(reader.getNSamples()[0], dtype=np.float32)
    for k in range(len(std)):
        if std[k] is None:
            std[k] = fill.copy()
    return np.vstack(std).astype(np.float32)


@router.post("/analyze")
async def analyze_frontend(
    file: UploadFile = File(...),
    patient_name: str = Form(""),
    patient_id: str = Form(""),
    age: str = Form("0"),
    gender: str = Form("Other"),
    description: str = Form(""),
):
    """
    Frontend-facing endpoint. Fields kept as-is from the frontend.
    Internally:
      1. Saves the uploaded EDF
      2. Registers/updates the patient in the registry
      3. Runs full Bi-GRU prediction  (via app.ml.inference.predict_edf)
      4. Reconstructs Coif1 D3/D4/D5 for a 4-second preview
      5. Extracts 8x69 feature matrix for the preview
      6. Returns everything in the shape EEGWorkspace expects
    """
    if not file.filename.lower().endswith(".edf"):
        raise HTTPException(400, "Only .edf files are supported")

    # ---------- 1. Save the file ----------
    fid = str(uuid.uuid4())
    edf_path = UPLOAD_DIR / f"{fid}_{file.filename}"
    with open(edf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # ---------- 1b. Auto-create / update patient registry ----------
    resolved_patient_id = (patient_id or "").strip() or f"P-{fid[:8]}"
    try:
        from app.db.database import SessionLocal
        from app.db.models import Patient
        db = SessionLocal()
        try:
            existing = (
                db.query(Patient)
                .filter(Patient.patient_id == resolved_patient_id)
                .first()
            )
            age_int = int(age) if str(age).strip().isdigit() else None
            if existing:
                if patient_name:
                    existing.name = patient_name
                if age_int is not None:
                    existing.age = age_int
                if gender:
                    existing.gender = gender
                if description:
                    existing.notes = description
            else:
                db.add(Patient(
                    patient_id=resolved_patient_id,
                    name=patient_name or "Unknown",
                    age=age_int,
                    gender=gender or None,
                    notes=description or "",
                ))
            db.commit()
            print(f"[patients] registered: {resolved_patient_id} ({patient_name})")
        finally:
            db.close()
    except Exception as e:
        # Never let patient registration break the analysis
        print(f"[patients] auto-register failed: {e}")

    # ---------- 2. Run the existing inference pipeline (Bi-GRU) ----------
    try:
        detection = inf.predict_edf(str(edf_path))
    except Exception as e:
        raise HTTPException(422, f"EEG processing failed: {e}")

    # ---------- 2b. Persist analysis to history (so Reports/Patients work) ----------
    try:
        from app.db.database import SessionLocal
        from app.db.models import AnalysisHistory
        from datetime import datetime
        db = SessionLocal()
        try:
            row = AnalysisHistory(
                file_id=fid,
                patient_id=resolved_patient_id,
                patient_name=patient_name or "Unknown",
                age=int(age) if str(age).strip().isdigit() else None,
                gender=gender or None,
                edf_filename=file.filename,
                duration_sec=float(detection.get("duration_sec") or 0),
                n_seizures=int(detection.get("n_seizures") or 0),
                mean_prob=float(detection.get("mean_prob") or 0),
                events_json=detection.get("seizure_events") or [],
                report_path="",  # PDF not generated by this endpoint
                created_at=datetime.utcnow(),
            )
            db.add(row)
            db.commit()
            print(f"[history] saved analysis {fid}")
        finally:
            db.close()
    except Exception as e:
        print(f"[history] persist failed: {e}")

    # ---------- 3. Load raw EEG to build the visualization ----------
    with pyedflib.EdfReader(str(edf_path)) as reader:
        raw_names = reader.getSignalLabels()
        mapping, _, _, diff = get_channel_mapping(raw_names)
        if diff:
            raise HTTPException(422, "EDF uses unsupported montage")
        data = _standardize(reader, mapping)     # (23, total_samples)

    data = _notch(data)

    # Pick a 4-sec window: around first seizure if any, else around minute 0
    events = detection.get("seizure_events", [])
    if events:
        start_sec = max(0, events[0][0] - 2)
    else:
        wins = detection.get("windows", [])
        if wins:
            peak = max(wins, key=lambda w: w.get("prob", 0))
            start_sec = peak["start_sec"]
        else:
            start_sec = 0

    start_sample = int(start_sec * FS)
    end_sample = start_sample + WINDOW_SAMPLES
    if end_sample > data.shape[1]:
        start_sample = max(0, data.shape[1] - WINDOW_SAMPLES)
        end_sample = start_sample + WINDOW_SAMPLES

    preview = data[:, start_sample:end_sample]   # (23, 1024)

    # ---------- 4. Coif1 D3/D4/D5 reconstructions ----------
    d3_list, d4_list, d5_list = [], [], []
    for ch in range(N_CHANNELS):
        sig = preview[ch].astype(np.float64)
        d3_list.append(_reconstruct_detail(sig, 3).round(4).tolist())
        d4_list.append(_reconstruct_detail(sig, 4).round(4).tolist())
        d5_list.append(_reconstruct_detail(sig, 5).round(4).tolist())

    # ---------- 5. 8x69 feature matrix for the preview window ----------
    fm = inf.extract_epoch_features(preview)   # (8, 69)

    # ---------- 6. AI prediction summary ----------
    n_seiz = int(detection["n_seizures"])
    prediction = "Seizure Detected" if n_seiz > 0 else "No Seizure Detected"
    confidence = float(max(detection["smoothed_probs"]) if detection["smoothed_probs"] else 0.0)

    # ---------- 7. Return frontend-shaped payload ----------
    return {
        # ---- what the frontend already uses ----
        "channels": CHANNELS_23,
        "sampling_rate": FS,
        "window_samples": WINDOW_SAMPLES,
        "window_seconds": WINDOW_SECONDS,
        "original_signal": preview.round(4).tolist(),
        "coif1_d3": d3_list,
        "coif1_d4": d4_list,
        "coif1_d5": d5_list,
        "feature_matrix": fm.round(4).tolist(),

        # ---- AI result cards ----
        "prediction": prediction,
        "confidence": confidence,

        # ---- metadata ----
        "file_id": fid,
        "file": edf_path.name,
        "duration_sec": detection["duration_sec"],
        "n_seizures": n_seiz,
        "seizure_events": events,
        "mean_prob": detection["mean_prob"],
        "threshold": detection["threshold"],
        "patient": {
            "name": patient_name,
            "patientId": resolved_patient_id,
            "age": age,
            "gender": gender,
            "description": description,
        },
    }