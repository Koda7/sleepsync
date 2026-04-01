import os


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sleepsync_dev.db",
)

FHIR_BASE_URL = os.getenv(
    "FHIR_BASE_URL",
    "https://hapi.fhir.org/baseR4",
).rstrip("/")

# Seconds; used by the FHIR HTTP client (search bundles can paginate slowly on public sandboxes).
FHIR_TIMEOUT = float(os.getenv("FHIR_TIMEOUT", "30"))

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]
