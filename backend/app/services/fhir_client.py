import httpx
from typing import Optional

from ..config import FHIR_BASE_URL

_client = httpx.Client(base_url=FHIR_BASE_URL, timeout=15.0)


def _get_bundle(resource_type: str, params: dict) -> list[dict]:
    """Fetch a FHIR Bundle and follow pagination links."""
    results = []
    resp = _client.get(f"/{resource_type}", params=params)
    resp.raise_for_status()
    bundle = resp.json()

    while True:
        for entry in bundle.get("entry", []):
            results.append(entry["resource"])

        next_link = None
        for link in bundle.get("link", []):
            if link["relation"] == "next":
                next_link = link["url"]
                break

        if not next_link:
            break

        resp = _client.get(next_link)
        resp.raise_for_status()
        bundle = resp.json()

    return results


def get_patient(patient_id: str) -> Optional[dict]:
    resp = _client.get(f"/Patient/{patient_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def get_conditions(patient_id: str) -> list[dict]:
    return _get_bundle("Condition", {"patient": patient_id, "_count": "100"})


def get_medications(patient_id: str) -> list[dict]:
    return _get_bundle(
        "MedicationRequest",
        {"patient": patient_id, "_count": "100"},
    )


def search_patients(name: Optional[str] = None, count: int = 20) -> list[dict]:
    params: dict = {"_count": str(count)}
    if name:
        params["name"] = name
    return _get_bundle("Patient", params)
