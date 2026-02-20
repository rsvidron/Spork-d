from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date
import re


def validate_hhmm(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    if not re.match(r"^\d{2}:\d{2}$", v):
        raise ValueError("Time must be in HH:MM format")
    h, m = map(int, v.split(":"))
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise ValueError("Invalid time value")
    return v


class WeeklyHourCreate(BaseModel):
    day_of_week: int   # 0=Mon … 6=Sun
    is_closed: bool = False
    start_time_local: Optional[str] = None
    end_time_local: Optional[str] = None
    interval_index: int = 0

    @field_validator("start_time_local", "end_time_local")
    @classmethod
    def validate_time(cls, v):
        return validate_hhmm(v)

    @field_validator("day_of_week")
    @classmethod
    def validate_dow(cls, v):
        if not 0 <= v <= 6:
            raise ValueError("day_of_week must be 0 (Mon) through 6 (Sun)")
        return v


class WeeklyHourRead(WeeklyHourCreate):
    id: int
    vendor_id: int

    class Config:
        from_attributes = True


class ExceptionCreate(BaseModel):
    exception_date: date
    is_closed: bool = False
    start_time_local: Optional[str] = None
    end_time_local: Optional[str] = None
    note: Optional[str] = None

    @field_validator("start_time_local", "end_time_local")
    @classmethod
    def validate_time(cls, v):
        return validate_hhmm(v)


class ExceptionRead(ExceptionCreate):
    id: int
    vendor_id: int

    class Config:
        from_attributes = True
