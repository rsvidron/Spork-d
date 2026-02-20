from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.favorite import Favorite
from app.models.vendor import Vendor, VendorStatus
from app.models.hours import VendorHoursWeekly, VendorHoursException
from app.models.user import User
from app.schemas.vendor import VendorSummary
from app.utils.auth import get_current_user
from app.services.hours_service import compute_open_status

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("", response_model=List[VendorSummary])
def get_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    favs = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    result = []
    for fav in favs:
        v = fav.vendor
        if not v:
            continue
        weekly = db.query(VendorHoursWeekly).filter(VendorHoursWeekly.vendor_id == v.id).all()
        exceptions = db.query(VendorHoursException).filter(VendorHoursException.vendor_id == v.id).all()
        open_status = compute_open_status(v.id, v.timezone, weekly, exceptions)
        result.append({
            "id": v.id, "name": v.name, "slug": v.slug, "category": v.category,
            "status": v.status, "city": v.city, "state": v.state,
            "latitude": v.latitude, "longitude": v.longitude,
            "average_rating": v.average_rating or 0.0, "review_count": v.review_count or 0,
            "favorite_count": v.favorite_count or 0, "cover_photo_url": v.cover_photo_url,
            "tags": [t.tag for t in v.tags],
            "distance_miles": None,
            "is_open": open_status.is_open,
            "open_status_label": open_status.status_label,
        })
    return result


@router.post("/{vendor_id}", status_code=201)
def add_favorite(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id, Favorite.vendor_id == vendor_id
    ).first()
    if existing:
        return {"message": "Already favorited"}

    fav = Favorite(user_id=current_user.id, vendor_id=vendor_id)
    db.add(fav)
    vendor.favorite_count = (vendor.favorite_count or 0) + 1
    db.commit()
    return {"message": "Added to favorites"}


@router.delete("/{vendor_id}", status_code=204)
def remove_favorite(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fav = db.query(Favorite).filter(
        Favorite.user_id == current_user.id, Favorite.vendor_id == vendor_id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Not favorited")
    db.delete(fav)
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if vendor and vendor.favorite_count:
        vendor.favorite_count = max(0, vendor.favorite_count - 1)
    db.commit()
