# app/routers/patients.py
"""
Patient registry endpoints.
- GET    /api/patients              → list all patients + analysis counts
- GET    /api/patients/{patient_id} → single patient + all their analyses
- POST   /api/patients              → create patient manually
- DELETE /api/patients/{patient_id} → delete patient
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.db.database import get_db
from app.db.models import Patient, AnalysisHistory

router = APIRouter(prefix="/api/patients", tags=["patients"])


# ---------- Schemas ----------
class PatientCreate(BaseModel):
    patient_id: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    notes: Optional[str] = ""


# ---------- List all patients with analysis counts ----------
@router.get("")
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).order_by(Patient.updated_at.desc()).all()

    result = []
    for p in patients:
        analyses = (
            db.query(AnalysisHistory)
            .filter(AnalysisHistory.patient_id == p.patient_id)
            .order_by(AnalysisHistory.created_at.desc())
            .all()
        )
        n_seiz = sum(a.n_seizures or 0 for a in analyses)
        total_dur = sum(a.duration_sec or 0 for a in analyses)
        last_date = analyses[0].created_at.isoformat() if analyses else None

        result.append({
            "patient_id": p.patient_id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "notes": p.notes,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
            "analyses_count": len(analyses),
            "seizures_count": n_seiz,
            "total_duration_sec": total_dur,
            "last_analysis": last_date,
        })

    return result


# ---------- Single patient + all their analyses ----------
@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")

    analyses = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.patient_id == patient_id)
        .order_by(AnalysisHistory.created_at.desc())
        .all()
    )

    return {
        "patient_id": p.patient_id,
        "name": p.name,
        "age": p.age,
        "gender": p.gender,
        "notes": p.notes,
        "created_at": p.created_at.isoformat(),
        "analyses": [
            {
                "file_id": a.file_id,
                "edf_filename": a.edf_filename,
                "duration_sec": a.duration_sec,
                "n_seizures": a.n_seizures,
                "mean_prob": a.mean_prob,
                "created_at": a.created_at.isoformat(),
                "report_url": f"/api/analysis/report/{a.file_id}",
            }
            for a in analyses
        ],
    }


# ---------- Create patient manually ----------
@router.post("")
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    existing = db.query(Patient).filter(Patient.patient_id == payload.patient_id).first()
    if existing:
        raise HTTPException(400, "Patient with this ID already exists")

    p = Patient(
        patient_id=payload.patient_id,
        name=payload.name,
        age=payload.age,
        gender=payload.gender,
        notes=payload.notes or "",
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    return {"status": "created", "patient_id": p.patient_id}


# ---------- Delete patient (and their analyses) ----------
@router.delete("/{patient_id}")
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(404, "Patient not found")

    db.query(AnalysisHistory).filter(AnalysisHistory.patient_id == patient_id).delete()
    db.delete(p)
    db.commit()
    return {"status": "deleted", "patient_id": patient_id}