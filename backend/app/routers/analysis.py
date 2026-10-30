# app/routers/analysis.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from pathlib import Path
import shutil, uuid
from datetime import datetime
from sqlalchemy.orm import Session
import numpy as np

from app.pdf.report import generate_pdf_report
from app.db.database import get_db
from app.db.models import AnalysisHistory

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

BASE = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BASE / "uploads"
REPORT_DIR = BASE / "reports"
UPLOAD_DIR.mkdir(exist_ok=True)
REPORT_DIR.mkdir(exist_ok=True)

MODEL_PATH     = BASE / "app" / "ml" / "best_cnn_chb01.keras"
THRESHOLD_PATH = BASE / "app" / "ml" / "chb01_decision_threshold.npy"
NORM_PATH      = BASE / "processed" / "chb01_norm_stats.npz"

# ---------- Auto-load: real model if present, else dummy ----------
import app.ml.inference as inf

if MODEL_PATH.exists() and THRESHOLD_PATH.exists() and NORM_PATH.exists():
    try:
        inf.load_artifacts(MODEL_PATH, THRESHOLD_PATH, NORM_PATH)
        print("[analysis] ✅ Real model loaded")
        _USING_DUMMY = False
    except Exception as e:
        print(f"[analysis] ❌ Real model failed: {e}")
        from app.ml.dummy_model import DummyModel
        inf._model = DummyModel()
        inf._threshold = 0.5
        inf._norm_mean = np.zeros((1, 552), dtype=np.float32)
        inf._norm_std  = np.ones((1, 552), dtype=np.float32)
        _USING_DUMMY = True
else:
    try:
        from app.ml.dummy_model import DummyModel
        inf._model = DummyModel()
        inf._threshold = 0.5
        inf._norm_mean = np.zeros((1, 552), dtype=np.float32)
        inf._norm_std  = np.ones((1, 552), dtype=np.float32)
        print("[analysis] ⚠️  DUMMY model loaded (train real model later)")
    except ImportError:
        print("[analysis] ⚠️  No model and no dummy_model.py — predictions will fail")
    _USING_DUMMY = True


@router.get("/model_status")
def model_status():
    return {
        "using_dummy": _USING_DUMMY,
        "model_exists": MODEL_PATH.exists(),
        "threshold_exists": THRESHOLD_PATH.exists(),
        "norm_stats_exists": NORM_PATH.exists(),
        "message": (
            "Running with DUMMY model. Download chb01 dataset, run "
            "`python -m app.ml.prepare_data` then `python -m app.ml.train`."
            if _USING_DUMMY else
            "Running with trained Bi-GRU model."
        ),
    }


@router.post("/analyze")
async def analyze_eeg(
    patient_id:   str = Form(...),
    patient_name: str = Form(...),
    age:          int = Form(...),
    gender:       str = Form(...),
    notes:        str = Form(""),
    edf: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not edf.filename.lower().endswith(".edf"):
        raise HTTPException(400, "Only .edf files are supported")

    file_id = str(uuid.uuid4())
    edf_path = UPLOAD_DIR / f"{file_id}_{edf.filename}"
    with open(edf_path, "wb") as f:
        shutil.copyfileobj(edf.file, f)

    try:
        result = inf.predict_edf(str(edf_path))
    except Exception as e:
        raise HTTPException(422, f"Processing failed: {e}")

    pdf_path = REPORT_DIR / f"{file_id}.pdf"
    generate_pdf_report(
        result=result,
        patient={
            "id": patient_id, "name": patient_name,
            "age": age, "gender": gender, "notes": notes,
        },
        out_path=pdf_path,
    )

    row = AnalysisHistory(
        file_id=file_id,
        patient_id=patient_id,
        patient_name=patient_name,
        age=age,
        gender=gender,
        edf_filename=edf.filename,
        duration_sec=result["duration_sec"],
        n_seizures=result["n_seizures"],
        mean_prob=result["mean_prob"],
        events_json=result["seizure_events"],
        report_path=str(pdf_path),
        created_at=datetime.utcnow(),
    )
    db.add(row); db.commit(); db.refresh(row)

    return {
        "status": "ok",
        "file_id": file_id,
        "patient": {"id": patient_id, "name": patient_name,
                    "age": age, "gender": gender, "notes": notes},
        "result": result,
        "report_url": f"/api/analysis/report/{file_id}",
    }


@router.get("/report/{file_id}")
async def get_report(file_id: str):
    pdf_path = REPORT_DIR / f"{file_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(404, "Report not found")
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"NeuroSense_{file_id}.pdf")


@router.get("/history")
async def get_history(patient_id: str | None = None,
                      db: Session = Depends(get_db)):
    q = db.query(AnalysisHistory)
    if patient_id:
        q = q.filter(AnalysisHistory.patient_id == patient_id)
    rows = q.order_by(AnalysisHistory.created_at.desc()).all()
    return [
        {
            "file_id": r.file_id,
            "patient_id": r.patient_id,
            "patient_name": r.patient_name,
            "edf_filename": r.edf_filename,
            "duration_sec": r.duration_sec,
            "n_seizures": r.n_seizures,
            "mean_prob": r.mean_prob,
            "created_at": r.created_at.isoformat(),
            "report_url": f"/api/analysis/report/{r.file_id}",
        }
        for r in rows
    ]


@router.get("/history/{file_id}")
async def get_history_detail(file_id: str, db: Session = Depends(get_db)):
    r = db.query(AnalysisHistory).filter_by(file_id=file_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    return {
        "file_id": r.file_id,
        "patient_id": r.patient_id,
        "patient_name": r.patient_name,
        "age": r.age, "gender": r.gender,
        "edf_filename": r.edf_filename,
        "duration_sec": r.duration_sec,
        "n_seizures": r.n_seizures,
        "mean_prob": r.mean_prob,
        "events": r.events_json,
        "created_at": r.created_at.isoformat(),
        "report_url": f"/api/analysis/report/{r.file_id}",
    }