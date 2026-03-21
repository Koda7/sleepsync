from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func

from ..database import Base


class Condition(Base):
    __tablename__ = "conditions"

    id = Column(Integer, primary_key=True, index=True)
    start = Column(DateTime)
    stop = Column(DateTime)
    patient_id = Column(String, index=True, nullable=False)
    encounter = Column(String)
    system = Column(String)
    code = Column(String)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())