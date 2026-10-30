# app/db/models.py
from sqlalchemy import Column, Integer, String, DateTime, Float, JSON
from datetime import datetime
from app.db.database import Base


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id           = Column(Integer, primary_key=True, index=True)
    file_id      = Column(String, unique=True, index=True)
    patient_id   = Column(String, index=True)
    patient_name = Column(String)
    age          = Column(Integer)
    gender       = Column(String)
    edf_filename = Column(String)
    duration_sec = Column(Float)
    n_seizures   = Column(Integer)
    mean_prob    = Column(Float)
    events_json  = Column(JSON)
    report_path  = Column(String)
    created_at   = Column(DateTime, default=datetime.utcnow)


class Patient(Base):
    __tablename__ = "patients"

    id           = Column(Integer, primary_key=True, index=True)
    patient_id   = Column(String, unique=True, index=True)
    name         = Column(String)
    age          = Column(Integer, nullable=True)
    gender       = Column(String, nullable=True)
    notes        = Column(String, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)