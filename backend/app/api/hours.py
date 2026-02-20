from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.vendor import Vendor
from app.models.hours import VendorHoursWeekly, VendorHoursException
from app.models.user import User, UserRole
from app.schemas.hours import WeeklyHourCreate, WeeklyHourRead, ExceptionCreate, ExceptionRead
from app.utils.auth import get_current_user
from app.services.hours_service import compute_open_status, get_weekly_schedule_display

router = APIRouter(prefix="/api/vendors/{vendor_id}/hours", tags=["hours"])


def _check_vendor_access(vendor_id: int, db: Session, current_user: User) -> Vendor:
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if current_user.role != UserRole.admin and vendor.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return vendor


# ─── Weekly hours ───────────────────────────────────────────────────────────

@router.get("/weekly", response_model=List[WeeklyHourRead])
def get_weekly_hours(vendor_id: int, db: Session = Depends(get_db)):
    return db.query(VendorHoursWeekly).filter(VendorHoursWeekly.vendor_id == vendor_id).all()


@router.put("/weekly", response_model=List[WeeklyHourRead])
def replace_weekly_hours(
    vendor_id: int,
    payload: List[WeeklyHourCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full replace of weekly schedule."""
    _check_vendor_access(vendor_id, db, current_user)
    db.query(VendorHoursWeekly).filter(VendorHoursWeekly.vendor_id == vendor_id).delete()
    rows = []
    for h in payload:
        row = VendorHoursWeekly(vendor_id=vendor_id, **h.model_dump())
        db.add(row)
        rows.append(row)
    db.commit()
    for r in rows:
        db.refresh(r)
    return rows


@router.delete("/weekly", status_code=204)
def clear_weekly_hours(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_vendor_access(vendor_id, db, current_user)
    db.query(VendorHoursWeekly).filter(VendorHoursWeekly.vendor_id == vendor_id).delete()
    db.commit()


# ─── Exception hours ────────────────────────────────────────────────────────

@router.get("/exceptions", response_model=List[ExceptionRead])
def get_exceptions(vendor_id: int, db: Session = Depends(get_db)):
    return db.query(VendorHoursException).filter(VendorHoursException.vendor_id == vendor_id).all()


@router.post("/exceptions", response_model=ExceptionRead, status_code=201)
def add_exception(
    vendor_id: int,
    payload: ExceptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_vendor_access(vendor_id, db, current_user)
    # Upsert by date
    existing = db.query(VendorHoursException).filter(
        VendorHoursException.vendor_id == vendor_id,
        VendorHoursException.exception_date == payload.exception_date,
    ).first()
    if existing:
        for k, v in payload.model_dump().items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    exc = VendorHoursException(vendor_id=vendor_id, **payload.model_dump())
    db.add(exc)
    db.commit()
    db.refresh(exc)
    return exc


@router.delete("/exceptions/{exception_id}", status_code=204)
def delete_exception(
    vendor_id: int,
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_vendor_access(vendor_id, db, current_user)
    exc = db.query(VendorHoursException).filter(
        VendorHoursException.id == exception_id,
        VendorHoursException.vendor_id == vendor_id,
    ).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
    db.delete(exc)
    db.commit()


@router.get("/status")
def get_open_status(vendor_id: int, db: Session = Depends(get_db)):
    """Returns current open/closed status with next open window."""
    from app.models.vendor import Vendor
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    weekly = db.query(VendorHoursWeekly).filter(VendorHoursWeekly.vendor_id == vendor_id).all()
    exceptions = db.query(VendorHoursException).filter(VendorHoursException.vendor_id == vendor_id).all()
    status = compute_open_status(vendor_id, vendor.timezone, weekly, exceptions)
    schedule = get_weekly_schedule_display(vendor_id, vendor.timezone, weekly, exceptions)

    return {
        "is_open": status.is_open,
        "status_label": status.status_label,
        "closes_at": status.closes_at,
        "opens_at": status.opens_at,
        "next_open_day": status.next_open_day,
        "timezone": vendor.timezone,
        "weekly_schedule": schedule,
    }
