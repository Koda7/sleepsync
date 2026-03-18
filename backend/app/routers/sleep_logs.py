from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from ..database import get_db
from ..models.sleep_log import SleepLog
from ..schemas.sleep_log import SleepLogCreate, SleepLogResponse, SleepLogUpdate

router = APIRouter(prefix="/api/sleep-logs", tags=["sleep-logs"])


@router.post("/", response_model=SleepLogResponse, status_code=201)
def create_sleep_log(payload: SleepLogCreate, db: Session = Depends(get_db)):
    entry = SleepLog(
        patient_id=payload.patient_id,
        date=payload.date,
        hours_slept=payload.hours_slept,
        quality=payload.quality,
        stress_level=payload.stress_level,
        notes=payload.notes,
        woke_during_night=int(payload.woke_during_night),
        trouble_falling_asleep=int(payload.trouble_falling_asleep),
        woke_too_early=int(payload.woke_too_early),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/patient/{patient_id}", response_model=list[SleepLogResponse])
def get_logs_by_patient(
    patient_id: str,
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(SleepLog).filter(SleepLog.patient_id == patient_id)
    if start_date:
        q = q.filter(SleepLog.date >= start_date)
    if end_date:
        q = q.filter(SleepLog.date <= end_date)
    return q.order_by(SleepLog.date.desc()).all()


@router.get("/{log_id}", response_model=SleepLogResponse)
def get_sleep_log(log_id: int, db: Session = Depends(get_db)):
    entry = db.query(SleepLog).filter(SleepLog.id == log_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    return entry


@router.put("/{log_id}", response_model=SleepLogResponse)
def update_sleep_log(
    log_id: int, payload: SleepLogUpdate, db: Session = Depends(get_db)
):
    entry = db.query(SleepLog).filter(SleepLog.id == log_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sleep log not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field in ("woke_during_night", "trouble_falling_asleep", "woke_too_early"):
            value = int(value)
        setattr(entry, field, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{log_id}", status_code=204)
def delete_sleep_log(log_id: int, db: Session = Depends(get_db)):
    entry = db.query(SleepLog).filter(SleepLog.id == log_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    db.delete(entry)
    db.commit()
