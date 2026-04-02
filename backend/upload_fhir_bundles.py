"""
Upload Synthea FHIR bundles to the HAPI FHIR R4 server.
Run from the backend directory: python upload_fhir_bundles.py

Expects JSON bundle files in ../data/fhir/
Extracts Patient, Condition, and MedicationRequest resources, rewrites
internal urn:uuid references to real resource paths, and uploads individually.
"""

import os
import json
import glob
import httpx

FHIR_BASE = os.getenv("FHIR_BASE_URL", "https://hapi.fhir.org/baseR4")
BUNDLE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'fhir')
KEEP_TYPES = {"Patient", "Condition", "MedicationRequest"}

client = httpx.Client(timeout=30.0)

files = sorted(glob.glob(os.path.join(BUNDLE_DIR, '*.json')))
if not files:
    print(f"No JSON files found in {os.path.abspath(BUNDLE_DIR)}")
    raise SystemExit(1)

print(f"Found {len(files)} bundle files")

uploaded = 0
failed = 0


def rewrite_refs(obj, urn_map):
    """Walk a dict/list and replace urn:uuid: references with real paths."""
    if isinstance(obj, dict):
        for key, val in obj.items():
            if key == "reference" and isinstance(val, str) and val in urn_map:
                obj[key] = urn_map[val]
            else:
                rewrite_refs(val, urn_map)
    elif isinstance(obj, list):
        for item in obj:
            rewrite_refs(item, urn_map)


def strip_dangling_refs(obj):
    """Recursively remove any dict that contains a urn:uuid: reference we couldn't resolve."""
    if isinstance(obj, dict):
        drop_keys = []
        for key, val in obj.items():
            if isinstance(val, dict):
                if "reference" in val and isinstance(val["reference"], str) and val["reference"].startswith("urn:uuid:"):
                    drop_keys.append(key)
                else:
                    strip_dangling_refs(val)
            elif isinstance(val, list):
                obj[key] = [
                    item for item in val
                    if not (isinstance(item, dict) and isinstance(item.get("reference"), str) and item["reference"].startswith("urn:uuid:"))
                ]
                for item in obj[key]:
                    strip_dangling_refs(item)
        for k in drop_keys:
            del obj[k]


for filepath in files:
    name = os.path.basename(filepath)
    with open(filepath) as f:
        bundle = json.load(f)

    if bundle.get("resourceType") != "Bundle":
        print(f"  SKIP {name} -- not a FHIR Bundle")
        continue

    entries = bundle.get("entry", [])

    # build a map from urn:uuid:xxx -> ResourceType/id for everything we keep
    urn_map = {}
    for entry in entries:
        res = entry.get("resource", {})
        full_url = entry.get("fullUrl", "")
        if res.get("resourceType") in KEEP_TYPES and full_url.startswith("urn:uuid:"):
            urn_map[full_url] = f"{res['resourceType']}/{res['id']}"

    # extract, rewrite references, and upload -- patients first
    resources = []
    for entry in entries:
        res = entry.get("resource", {})
        if res.get("resourceType") not in KEEP_TYPES:
            continue
        rewrite_refs(res, urn_map)
        strip_dangling_refs(res)
        resources.append(res)

    resources.sort(key=lambda r: 0 if r["resourceType"] == "Patient" else 1)

    if not resources:
        print(f"  SKIP {name} -- no relevant resources")
        continue

    ok = 0
    for resource in resources:
        rtype = resource["resourceType"]
        rid = resource["id"]
        resp = client.put(f"{FHIR_BASE}/{rtype}/{rid}", json=resource)
        if resp.status_code in (200, 201):
            ok += 1
        else:
            failed += 1
            detail = resp.text[:150] if resp.text else str(resp.status_code)
            print(f"  FAIL {rtype}/{rid} -- {resp.status_code}: {detail}")

    uploaded += ok
    print(f"  {name}: {ok}/{len(resources)} resources")

client.close()
print(f"\nDone: {uploaded} uploaded, {failed} failed")
