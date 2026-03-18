from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..services import fhir_client

router = APIRouter(prefix="/api/fhir", tags=["fhir"])


@router.get("/patient/{patient_id}")
def get_patient(patient_id: str):
    patient = fhir_client.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found on FHIR server")

    return {
        "id": patient["id"],
        "name": _format_name(patient),
        "birthDate": patient.get("birthDate"),
        "gender": patient.get("gender"),
    }


@router.get("/patient/{patient_id}/conditions")
def get_conditions(patient_id: str):
    raw = fhir_client.get_conditions(patient_id)
    return [
        {
            "id": c["id"],
            "code": c.get("code", {}).get("text", "Unknown"),
            "clinicalStatus": _nested_code(c, "clinicalStatus"),
            "onsetDateTime": c.get("onsetDateTime"),
        }
        for c in raw
    ]


@router.get("/patient/{patient_id}/medications")
def get_medications(patient_id: str):
    raw = fhir_client.get_medications(patient_id)
    return [
        {
            "id": m["id"],
            "medication": _medication_text(m),
            "status": m.get("status"),
            "authoredOn": m.get("authoredOn"),
            "dosage": _dosage_text(m),
        }
        for m in raw
    ]


@router.get("/patients/search")
def search_patients(name: Optional[str] = Query(default=None)):
    raw = fhir_client.search_patients(name=name)
    return [
        {
            "id": p["id"],
            "name": _format_name(p),
            "birthDate": p.get("birthDate"),
            "gender": p.get("gender"),
        }
        for p in raw
    ]


def _format_name(patient: dict) -> str:
    names = patient.get("name", [])
    if not names:
        return "Unknown"
    n = names[0]
    given = " ".join(n.get("given", []))
    family = n.get("family", "")
    return f"{given} {family}".strip()


def _nested_code(resource: dict, field: str) -> str:
    obj = resource.get(field, {})
    codings = obj.get("coding", [])
    if codings:
        return codings[0].get("code", "unknown")
    return "unknown"


def _medication_text(med_request: dict) -> str:
    concept = med_request.get("medicationCodeableConcept", {})
    if concept.get("text"):
        return concept["text"]
    codings = concept.get("coding", [])
    if codings:
        return codings[0].get("display", "Unknown medication")
    return "Unknown medication"


def _dosage_text(med_request: dict) -> str:
    dosages = med_request.get("dosageInstruction", [])
    if not dosages:
        return ""
    return dosages[0].get("text", "")
