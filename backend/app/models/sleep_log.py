from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text
from sqlalchemy.sql import func

from ..database import Base


class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False)
    hours_slept = Column(Float, nullable=False)
    quality = Column(Integer, nullable=False)  # 1-5 scale
    stress_level = Column(Integer, nullable=True)  # 1-5 scale
    notes = Column(Text, nullable=True)
    activity = Column(String, nullable=True)

    woke_during_night = Column(Integer, default=0)
    trouble_falling_asleep = Column(Integer, default=0)
    woke_too_early = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
