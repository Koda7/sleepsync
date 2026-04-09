import os


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./sleepsync_dev.db",
)
# Render gives postgres:// but SQLAlchemy 2.x requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

FHIR_BASE_URL = os.getenv(
    "FHIR_BASE_URL",
    "https://hapi.fhir.org/baseR4",
).rstrip("/")

FHIR_TIMEOUT = float(os.getenv("FHIR_TIMEOUT", "30"))

HF_TOKEN = os.getenv("HF_TOKEN", "")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]

_extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if _extra_origins:
    ALLOWED_ORIGINS.extend(o.strip() for o in _extra_origins.split(",") if o.strip())
