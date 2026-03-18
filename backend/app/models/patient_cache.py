from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func

from ..database import Base


class PatientCache(Base):
    """Caches FHIR patient data locally so we aren't hammering the
    HAPI server on every page load."""

    __tablename__ = "patient_cache"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True, nullable=False)
    resource_type = Column(String, nullable=False)
    data = Column(JSON, nullable=False)
    fetched_at = Column(DateTime, server_default=func.now())
