"""Insights endpoints: AI sleep summary and sleep quality prediction."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.sleep_log import SleepLog
from ..services import fhir_client
from ..services.hf_inference import generate_sleep_summary
from ..services.sleep_predictor import build_features, predict_quality

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("/summary/{patient_id}")
def get_sleep_summary(patient_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Generate an AI-powered plain-language summary of the patient's sleep trends."""

    logs = (
        db.query(SleepLog)
        .filter(SleepLog.patient_id == patient_id)
        .order_by(SleepLog.date.desc())
        .limit(30)
        .all()
    )

    sleep_stats = _compute_stats(logs)
    patient_data = fhir_client.get_patient(patient_id)
    if not patient_data:
        raise HTTPException(status_code=404, detail="Patient not found on FHIR server")

    patient_name = _format_name(patient_data)

    if not logs:
        return {
            "patient_id": patient_id,
            "patient_name": patient_name,
            "summary": None,
            "stats": sleep_stats,
        }

    raw_conditions = fhir_client.get_conditions(patient_id)
    active_conditions = _extract_active_conditions(raw_conditions)

    raw_meds = fhir_client.get_medication_requests(patient_id)
    active_meds = _extract_active_medications(raw_meds)

    summary = generate_sleep_summary(patient_name, sleep_stats, active_conditions, active_meds)

    return {
        "patient_id": patient_id,
        "patient_name": patient_name,
        "summary": summary,
        "stats": sleep_stats,
    }


@router.get("/prediction/{patient_id}")
def get_sleep_prediction(patient_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Predict next-night sleep quality based on recent logs and clinical context."""

    logs = (
        db.query(SleepLog)
        .filter(SleepLog.patient_id == patient_id)
        .order_by(SleepLog.date.desc())
        .limit(30)
        .all()
    )

    if not logs:
        return {
            "patient_id": patient_id,
            "prediction": None,
            "features_used": 0,
        }

    log_dicts = [
        {
            "hours_slept": l.hours_slept,
            "quality": l.quality,
            "stress_level": l.stress_level,
            "woke_during_night": l.woke_during_night,
            "trouble_falling_asleep": l.trouble_falling_asleep,
            "woke_too_early": l.woke_too_early,
        }
        for l in logs
    ]

    patient_data = fhir_client.get_patient(patient_id)
    if not patient_data:
        raise HTTPException(status_code=404, detail="Patient not found on FHIR server")

    age = _compute_age(patient_data.get("birthDate"))

    raw_conditions = fhir_client.get_conditions(patient_id)
    active_conditions = _extract_active_conditions(raw_conditions)

    raw_meds = fhir_client.get_medication_requests(patient_id)
    active_meds = _extract_active_medications(raw_meds)

    features = build_features(log_dicts, active_conditions, active_meds, age)
    prediction = predict_quality(features)

    return {
        "patient_id": patient_id,
        "prediction": prediction,
        "features_used": len(features),
    }


def _compute_stats(logs: list[SleepLog]) -> dict[str, Any]:
    if not logs:
        return {"total_logs": 0}

    hours = [l.hours_slept for l in logs]
    quality = [l.quality for l in logs]
    stress = [l.stress_level or 3 for l in logs]

    poor = sum(1 for q in quality if q <= 2)
    disturbances = sum(
        1 for l in logs
        if l.woke_during_night or l.trouble_falling_asleep or l.woke_too_early
    )

    recent_7 = quality[:7]
    older_7 = quality[7:14]
    if recent_7 and older_7:
        diff = sum(recent_7) / len(recent_7) - sum(older_7) / len(older_7)
        if diff > 0.3:
            trend = "improving"
        elif diff < -0.3:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient data for trend"

    return {
        "total_logs": len(logs),
        "avg_hours": sum(hours) / len(hours),
        "avg_quality": sum(quality) / len(quality),
        "avg_stress": sum(stress) / len(stress),
        "poor_nights": poor,
        "disturbance_nights": disturbances,
        "trend": trend,
    }


def _extract_active_conditions(raw: list[dict[str, Any]]) -> list[str]:
    result = []
    for c in raw:
        status_obj = c.get("clinicalStatus", {})
        status_text = ""
        if isinstance(status_obj, dict):
            for coding in status_obj.get("coding", []) or []:
                if coding.get("code"):
                    status_text = coding["code"]
                    break
            if not status_text:
                status_text = status_obj.get("text", "")

        if status_text.lower() != "active":
            continue

        code_obj = c.get("code", {})
        display = ""
        if isinstance(code_obj, dict):
            display = code_obj.get("text", "")
            if not display:
                for coding in code_obj.get("coding", []) or []:
                    if coding.get("display"):
                        display = coding["display"]
                        break
        if display and display != "Unknown":
            result.append(display)
    return result


def _extract_active_medications(raw: list[dict[str, Any]]) -> list[str]:
    result = []
    for m in raw:
        if m.get("status") != "active":
            continue

        name = ""
        ref = m.get("medicationReference", {})
        if isinstance(ref, dict) and ref.get("display"):
            name = ref["display"]
        if not name:
            concept = m.get("medicationCodeableConcept", {})
            if isinstance(concept, dict):
                name = concept.get("text", "")
                if not name:
                    for coding in concept.get("coding", []) or []:
                        if coding.get("display"):
                            name = coding["display"]
                            break
        if name and name != "Unknown":
            result.append(name)
    return result


def _format_name(patient: dict[str, Any]) -> str:
    names = patient.get("name", [])
    if not names:
        return "Unknown"
    n = names[0] if isinstance(names[0], dict) else names[0]
    given = " ".join(n.get("given", []))
    family = n.get("family", "")
    return f"{given} {family}".strip()


def _compute_age(birth_date: str | None) -> int | None:
    if not birth_date:
        return None
    from datetime import date
    try:
        parts = birth_date.split("-")
        born = date(int(parts[0]), int(parts[1]), int(parts[2]))
        today = date.today()
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    except (ValueError, IndexError):
        return None
