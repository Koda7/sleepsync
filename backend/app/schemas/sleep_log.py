from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional


class SleepLogCreate(BaseModel):
    patient_id: str
    date: date
    hours_slept: float = Field(ge=0, le=24)
    quality: int = Field(ge=1, le=5)
    stress_level: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    activity: Optional[str] = None
    woke_during_night: bool = False
    trouble_falling_asleep: bool = False
    woke_too_early: bool = False


class SleepLogUpdate(BaseModel):
    hours_slept: Optional[float] = Field(default=None, ge=0, le=24)
    quality: Optional[int] = Field(default=None, ge=1, le=5)
    stress_level: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    activity: Optional[str] = None
    woke_during_night: Optional[bool] = None
    trouble_falling_asleep: Optional[bool] = None
    woke_too_early: Optional[bool] = None


class SleepLogResponse(BaseModel):
    id: int
    patient_id: str
    date: date
    hours_slept: float
    quality: int
    stress_level: Optional[int]
    notes: Optional[str]
    activity: Optional[str]
    woke_during_night: bool
    trouble_falling_asleep: bool
    woke_too_early: bool
    created_at: datetime

    model_config = {"from_attributes": True}
