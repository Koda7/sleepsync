from __future__ import annotations

import logging
from typing import Any, Optional, Type, Union

import httpx
from pydantic import ValidationError

from fhir.resources.R4B.bundle import Bundle
from fhir.resources.R4B.condition import Condition
from fhir.resources.R4B.medicationrequest import MedicationRequest
from fhir.resources.R4B.patient import Patient

from ..config import FHIR_BASE_URL, FHIR_TIMEOUT

logger = logging.getLogger(__name__)

_client = httpx.Client(base_url=FHIR_BASE_URL, timeout=FHIR_TIMEOUT)


def _resource_to_dict(resource: Any) -> dict[str, Any]:
    return resource.model_dump(mode="json", exclude_none=False)


def _resources_from_bundle_payload(
    bundle_dict: dict[str, Any],
    *,
    want_type: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Parse a FHIR Bundle JSON payload into plain dicts, optionally filtering by resourceType."""
    try:
        bundle = Bundle.model_validate(bundle_dict)
    except ValidationError as exc:
        logger.warning("FHIR Bundle validation failed, using raw entry resources: %s", exc)
        out: list[dict[str, Any]] = []
        for entry in bundle_dict.get("entry", []) or []:
            res = entry.get("resource")
            if not res:
                continue
            if want_type and res.get("resourceType") != want_type:
                continue
            out.append(res)
        return out

    results: list[dict[str, Any]] = []
    for entry in bundle.entry or []:
        if not entry.resource:
            continue
        res = entry.resource
        rtype = getattr(res, "__resource_type__", None)
        if want_type and rtype != want_type:
            continue
        try:
            results.append(_resource_to_dict(res))
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Could not serialize FHIR resource %s: %s", rtype, exc)
    return results


def _get_bundle_pages(
    resource_type: str,
    params: dict[str, str],
    *,
    want_type: str,
) -> list[dict[str, Any]]:
    """Fetch all pages of a FHIR search Bundle and return validated resource dicts."""
    results: list[dict[str, Any]] = []
    resp = _client.get(f"/{resource_type}", params=params)
    resp.raise_for_status()
    bundle_dict = resp.json()

    while True:
        page = _resources_from_bundle_payload(bundle_dict, want_type=want_type)
        results.extend(page)

        next_link: Optional[str] = None
        for link in bundle_dict.get("link", []) or []:
            if link.get("relation") == "next":
                next_link = link.get("url")
                break

        if not next_link:
            break

        # next_link is usually absolute on HAPI; httpx resolves absolute URLs correctly.
        resp = _client.get(next_link)
        resp.raise_for_status()
        bundle_dict = resp.json()

    return results


def _validate_or_raw(
    data: dict[str, Any],
    model: Union[Type[Patient], Type[Condition], Type[MedicationRequest]],
    label: str,
) -> dict[str, Any]:
    try:
        instance = model.model_validate(data)
        return _resource_to_dict(instance)
    except ValidationError as exc:
        logger.warning("FHIR %s validation failed, returning raw JSON: %s", label, exc)
        return data


def get_patient(patient_id: str) -> Optional[dict[str, Any]]:
    resp = _client.get(f"/Patient/{patient_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    raw = resp.json()
    return _validate_or_raw(raw, Patient, "Patient")


def get_condition(condition_id: str) -> Optional[dict[str, Any]]:
    resp = _client.get(f"/Condition/{condition_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    raw = resp.json()
    return _validate_or_raw(raw, Condition, "Condition")


def get_medication_request(medication_request_id: str) -> Optional[dict[str, Any]]:
    resp = _client.get(f"/MedicationRequest/{medication_request_id}")
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    raw = resp.json()
    return _validate_or_raw(raw, MedicationRequest, "MedicationRequest")


def get_conditions(patient_id: str) -> list[dict[str, Any]]:
    return _get_bundle_pages(
        "Condition",
        {"patient": patient_id, "_count": "100"},
        want_type="Condition",
    )


def get_medication_requests(patient_id: str) -> list[dict[str, Any]]:
    return _get_bundle_pages(
        "MedicationRequest",
        {"patient": patient_id, "_count": "100"},
        want_type="MedicationRequest",
    )


def search_patients(name: Optional[str] = None, count: int = 20) -> list[dict[str, Any]]:
    params: dict[str, str] = {"_count": str(count)}
    if name:
        params["name"] = name
    return _get_bundle_pages("Patient", params, want_type="Patient")
