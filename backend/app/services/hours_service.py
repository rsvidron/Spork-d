"""
DST-safe operating hours service.

Key design:
- All "wall clock" times are stored as HH:MM strings (e.g., "11:00", "21:30").
- Vendor's IANA timezone (e.g., "America/New_York") is stored on the Vendor model.
- To check open/closed: convert utcnow() → vendor local time, then compare local HH:MM.
- This is correct across DST transitions because we work with the local clock, not UTC offsets.
- Special note on midnight-spanning intervals: e.g., 22:00–02:00 — handled by splitting at midnight.
"""

from datetime import datetime, date, time, timedelta
from typing import Optional, List, Tuple
import pytz
from dataclasses import dataclass


@dataclass
class TimeInterval:
    start: str   # "HH:MM"
    end: str     # "HH:MM"


@dataclass
class OpenStatus:
    is_open: bool
    status_label: str          # "Open now", "Closed", "Opens at X", "Closes at X"
    closes_at: Optional[str]   # local time string if open
    opens_at: Optional[str]    # next open time if closed
    next_open_day: Optional[str]  # e.g., "tomorrow", "Friday"


def parse_hhmm(hhmm: str) -> time:
    """Parse 'HH:MM' to datetime.time."""
    h, m = hhmm.split(":")
    return time(int(h), int(m))


def format_hhmm(t: time) -> str:
    return t.strftime("%H:%M")


def format_12h(hhmm: str) -> str:
    """Convert 24h 'HH:MM' → '12:00 PM'."""
    t = parse_hhmm(hhmm)
    return datetime.combine(date.today(), t).strftime("%-I:%M %p")


def interval_contains(start_hhmm: str, end_hhmm: str, current_hhmm: str) -> bool:
    """
    Check if current_hhmm is within [start, end) on the same calendar day.
    Handles midnight-crossing intervals (start > end) by splitting.
    """
    start = parse_hhmm(start_hhmm)
    end = parse_hhmm(end_hhmm)
    cur = parse_hhmm(current_hhmm)

    if start <= end:
        # Normal interval: e.g., 11:00–14:00
        return start <= cur < end
    else:
        # Midnight-crossing: e.g., 22:00–02:00 → open if cur>=22:00 OR cur<02:00
        return cur >= start or cur < end


def minutes_since_midnight(hhmm: str) -> int:
    t = parse_hhmm(hhmm)
    return t.hour * 60 + t.minute


def get_vendor_local_datetime(vendor_timezone: str, reference_utc: Optional[datetime] = None) -> datetime:
    """Convert UTC now (or provided UTC datetime) to vendor's local time."""
    tz = pytz.timezone(vendor_timezone)
    if reference_utc is None:
        reference_utc = datetime.utcnow().replace(tzinfo=pytz.utc)
    elif reference_utc.tzinfo is None:
        reference_utc = reference_utc.replace(tzinfo=pytz.utc)
    return reference_utc.astimezone(tz)


def get_intervals_for_date(
    vendor_id: int,
    target_date: date,
    vendor_timezone: str,
    weekly_hours: list,
    exceptions: list,
) -> Tuple[bool, List[TimeInterval]]:
    """
    Returns (is_closed_all_day, [intervals]) for a given calendar date in vendor's tz.
    Checks exceptions first, then falls back to weekly schedule.
    """
    # Check exceptions
    for exc in exceptions:
        if exc.vendor_id == vendor_id and exc.exception_date == target_date:
            if exc.is_closed:
                return True, []
            else:
                return False, [TimeInterval(exc.start_time_local, exc.end_time_local)]

    # Weekly schedule (day_of_week: 0=Mon…6=Sun, matches Python's weekday())
    dow = target_date.weekday()  # 0=Mon
    day_slots = [h for h in weekly_hours if h.vendor_id == vendor_id and h.day_of_week == dow]

    if not day_slots:
        return True, []  # No schedule = closed

    if any(s.is_closed for s in day_slots):
        return True, []

    intervals = [
        TimeInterval(s.start_time_local, s.end_time_local)
        for s in sorted(day_slots, key=lambda x: x.interval_index)
        if s.start_time_local and s.end_time_local
    ]
    return False, intervals


def compute_open_status(
    vendor_id: int,
    vendor_timezone: str,
    weekly_hours: list,
    exceptions: list,
    reference_utc: Optional[datetime] = None,
) -> OpenStatus:
    """
    Full open/closed computation for a vendor at a given UTC moment.
    """
    local_now = get_vendor_local_datetime(vendor_timezone, reference_utc)
    current_date = local_now.date()
    current_hhmm = local_now.strftime("%H:%M")

    is_closed_today, intervals_today = get_intervals_for_date(
        vendor_id, current_date, vendor_timezone, weekly_hours, exceptions
    )

    if not is_closed_today:
        for interval in intervals_today:
            if interval_contains(interval.start, interval.end, current_hhmm):
                # Currently open
                return OpenStatus(
                    is_open=True,
                    status_label=f"Open · Closes {format_12h(interval.end)}",
                    closes_at=interval.end,
                    opens_at=None,
                    next_open_day=None,
                )

        # Closed now but maybe opens later today
        future_today = [
            iv for iv in intervals_today
            if minutes_since_midnight(iv.start) > minutes_since_midnight(current_hhmm)
        ]
        if future_today:
            next_iv = min(future_today, key=lambda iv: minutes_since_midnight(iv.start))
            return OpenStatus(
                is_open=False,
                status_label=f"Closed · Opens {format_12h(next_iv.start)}",
                closes_at=None,
                opens_at=next_iv.start,
                next_open_day="today",
            )

    # Look ahead up to 7 days for next open window
    for delta in range(1, 8):
        next_date = current_date + timedelta(days=delta)
        is_closed, intervals = get_intervals_for_date(
            vendor_id, next_date, vendor_timezone, weekly_hours, exceptions
        )
        if not is_closed and intervals:
            next_iv = intervals[0]
            day_label = _day_label(current_date, next_date)
            return OpenStatus(
                is_open=False,
                status_label=f"Closed · Opens {day_label} {format_12h(next_iv.start)}",
                closes_at=None,
                opens_at=next_iv.start,
                next_open_day=day_label,
            )

    return OpenStatus(
        is_open=False,
        status_label="Closed",
        closes_at=None,
        opens_at=None,
        next_open_day=None,
    )


def _day_label(today: date, target: date) -> str:
    delta = (target - today).days
    if delta == 1:
        return "tomorrow"
    return target.strftime("%A")  # "Friday"


def vendor_is_open_at(
    vendor_id: int,
    vendor_timezone: str,
    weekly_hours: list,
    exceptions: list,
    check_utc: datetime,
) -> bool:
    """Quick boolean: is vendor open at given UTC moment?"""
    status = compute_open_status(
        vendor_id, vendor_timezone, weekly_hours, exceptions, reference_utc=check_utc
    )
    return status.is_open


def vendor_open_on_day_at_time(
    vendor_id: int,
    vendor_timezone: str,
    weekly_hours: list,
    exceptions: list,
    target_dow: int,   # 0=Mon…6=Sun
    target_hhmm: str,  # "HH:MM" in USER's local time — will be interpreted as vendor tz
) -> bool:
    """
    Check if vendor is open on a specific day-of-week at a specific local time.
    Used for "Open Friday at 9 PM" filter.

    NOTE: target_hhmm is treated directly as a wall-clock time to compare
    against the vendor's schedule (both are in "local" clock terms).
    The caller is responsible for passing the time in the vendor's timezone
    or the user's local timezone depending on display context.
    For search filters, we compare user-supplied local time against vendor local schedule.
    """
    # Find next occurrence of target_dow from today
    today = date.today()
    days_ahead = (target_dow - today.weekday()) % 7
    target_date = today + timedelta(days=days_ahead)

    is_closed, intervals = get_intervals_for_date(
        vendor_id, target_date, vendor_timezone, weekly_hours, exceptions
    )
    if is_closed or not intervals:
        return False

    for interval in intervals:
        if interval_contains(interval.start, interval.end, target_hhmm):
            return True
    return False


def get_weekly_schedule_display(
    vendor_id: int,
    vendor_timezone: str,
    weekly_hours: list,
    exceptions: list,
) -> list:
    """
    Returns a display-ready weekly schedule grouped by day.
    """
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    result = []
    for dow, day_name in enumerate(days):
        day_slots = [
            h for h in weekly_hours
            if h.vendor_id == vendor_id and h.day_of_week == dow and not h.is_closed
        ]
        if not day_slots:
            closed_slot = [h for h in weekly_hours if h.vendor_id == vendor_id and h.day_of_week == dow and h.is_closed]
            result.append({
                "day": day_name,
                "dow": dow,
                "is_closed": True,
                "intervals": []
            })
        else:
            result.append({
                "day": day_name,
                "dow": dow,
                "is_closed": False,
                "intervals": [
                    {
                        "start": s.start_time_local,
                        "end": s.end_time_local,
                        "start_12h": format_12h(s.start_time_local) if s.start_time_local else None,
                        "end_12h": format_12h(s.end_time_local) if s.end_time_local else None,
                    }
                    for s in sorted(day_slots, key=lambda x: x.interval_index)
                ]
            })
    return result
