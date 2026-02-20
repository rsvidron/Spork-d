"""
Operating hours models.

Design decisions for DST-safe storage:
- weekly_hours stores "wall clock" local times (e.g., "11:00", "14:00") + vendor's IANA timezone.
  When checking open/closed, we convert the current UTC moment into the vendor's timezone,
  then compare the local time against the stored intervals. This means "11:00 AM" always
  means 11:00 AM in the vendor's local time, regardless of DST.
- exceptions store a calendar date + local start/end times + vendor timezone for the same reason.
"""

from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, Time
from sqlalchemy.orm import relationship
from app.database import Base


class VendorHoursWeekly(Base):
    """
    Weekly recurring schedule.
    One row per day-of-week interval.
    Multiple rows per day_of_week are allowed (e.g., split lunch/dinner).

    day_of_week: 0=Monday … 6=Sunday (ISO weekday - 1)
    start_time_local / end_time_local: wall-clock times in vendor's timezone (no tz info stored here)
    interval_index: ordering for multiple intervals on same day (0, 1, 2…)
    """

    __tablename__ = "vendor_hours_weekly"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Mon … 6=Sun
    is_closed = Column(Boolean, default=False)
    start_time_local = Column(String(5))   # "HH:MM" (omit if closed)
    end_time_local = Column(String(5))     # "HH:MM" (omit if closed)
    interval_index = Column(Integer, default=0)

    vendor = relationship("Vendor", back_populates="weekly_hours")


class VendorHoursException(Base):
    """
    Date-specific overrides: holiday closures or one-off extended hours.
    If is_closed=True, the vendor is closed all day regardless of weekly schedule.
    If is_closed=False, start/end times override the weekly schedule for that date.
    """

    __tablename__ = "vendor_hours_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    exception_date = Column(Date, nullable=False, index=True)
    is_closed = Column(Boolean, default=False)
    start_time_local = Column(String(5))   # "HH:MM"
    end_time_local = Column(String(5))     # "HH:MM"
    note = Column(String)                  # e.g., "Christmas closure"

    vendor = relationship("Vendor", back_populates="hour_exceptions")
