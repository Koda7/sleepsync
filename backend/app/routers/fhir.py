from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from ..services import fhir_client

router = APIRouter(prefix="/api/fhir", tags=["fhir"])


@router.get("/patient/{patient_id}")
def read_patient(patient_id: str) -> dict[str, Any]:
    """Read a single Patient from the configured FHIR server (validated with fhir.resources)."""
    patient = fhir_client.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found on FHIR server")

    return {
        "id": patient["id"],
        "name": _format_name(patient),
        "birthDate": patient.get("birthDate"),
        "gender": patient.get("gender"),
        "telecom": patient.get("telecom"),
        "address": patient.get("address"),
    }


@router.get("/patient/{patient_id}/conditions")
def list_conditions_for_patient(patient_id: str) -> list[dict[str, Any]]:
    """Search Condition resources for a patient (`GET /Condition?patient=...`)."""
    raw = fhir_client.get_conditions(patient_id)
    return [_condition_summary(c) for c in raw]


@router.get("/patient/{patient_id}/medications")
def list_medication_requests_for_patient(patient_id: str) -> list[dict[str, Any]]:
    """Search MedicationRequest resources for a patient (`GET /MedicationRequest?patient=...`)."""
    raw = fhir_client.get_medication_requests(patient_id)
    return [_medication_request_summary(m) for m in raw]


@router.get("/conditions/{condition_id}")
def read_condition(condition_id: str) -> dict[str, Any]:
    """Read a single Condition by id (`GET /Condition/{id}`)."""
    condition = fhir_client.get_condition(condition_id)
    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found on FHIR server")
    return _condition_summary(condition)


@router.get("/medication-requests/{medication_request_id}")
def read_medication_request(medication_request_id: str) -> dict[str, Any]:
    """Read a single MedicationRequest by id (`GET /MedicationRequest/{id}`)."""
    med = fhir_client.get_medication_request(medication_request_id)
    if not med:
        raise HTTPException(
            status_code=404,
            detail="MedicationRequest not found on FHIR server",
        )
    return _medication_request_summary(med)


@router.get("/patients/search")
def search_patients(name: Optional[str] = Query(default=None)) -> list[dict[str, Any]]:
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


def _format_name(patient: dict[str, Any]) -> str:
    names = patient.get("name", [])
    if not names:
        return "Unknown"
    n = names[0]
    given = " ".join(n.get("given", []))
    family = n.get("family", "")
    return f"{given} {family}".strip()


def _codeable_concept_text(concept: Optional[dict[str, Any]]) -> str:
    if not concept:
        return "Unknown"
    if concept.get("text"):
        return concept["text"]
    for coding in concept.get("coding", []) or []:
        if coding.get("display"):
            return coding["display"]
        if coding.get("code"):
            return coding["code"]
    return "Unknown"


def _condition_summary(c: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": c["id"],
        "code": _codeable_concept_text(c.get("code")),
        "clinicalStatus": _nested_code_display(c, "clinicalStatus"),
        "verificationStatus": _nested_code_display(c, "verificationStatus"),
        "onsetDateTime": c.get("onsetDateTime"),
        "onsetPeriod": c.get("onsetPeriod"),
        "recordedDate": c.get("recordedDate"),
    }


def _nested_code_display(resource: dict[str, Any], field: str) -> Optional[str]:
    obj = resource.get(field)
    if not obj:
        return None
    return _codeable_concept_text(obj)


def _medication_text(med_request: dict[str, Any]) -> str:
    ref = med_request.get("medicationReference", {})
    if ref.get("display"):
        return ref["display"]
    concept = med_request.get("medicationCodeableConcept", {})
    return _codeable_concept_text(concept)


def _medication_request_summary(m: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": m["id"],
        "medication": _medication_text(m),
        "status": m.get("status"),
        "intent": m.get("intent"),
        "authoredOn": m.get("authoredOn"),
        "dosage": _dosage_text(m),
    }


def _dosage_text(med_request: dict[str, Any]) -> str:
    dosages = med_request.get("dosageInstruction", [])
    if not dosages:
        return ""
    return dosages[0].get("text", "")
