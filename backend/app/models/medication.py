from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.sql import func

from ..database import Base


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    start = Column(DateTime)
    stop = Column(DateTime)
    patient_id = Column(String, index=True, nullable=False)
    payer = Column(String)
    encounter = Column(String)
    code = Column(String)
    description = Column(Text)
    base_cost = Column(Float)
    payer_coverage = Column(Float)
    dispenses = Column(Integer)
    totalcost = Column(Float)
    reasoncode = Column(String)
    reasondescription = Column(Text)
    created_at = Column(DateTime, server_default=func.now())