from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.vendor import Vendor, VendorTag, VendorPhoto, VendorStatus
from app.models.hours import VendorHoursWeekly, VendorHoursException
from app.models.favorite import Favorite
from app.models.user import User, UserRole
from app.schemas.vendor import VendorCreate, VendorRead, VendorUpdate, VendorSummary
from app.utils.auth import get_current_user, require_vendor_or_admin, require_admin
from app.utils.geo import haversine_distance, bounding_box, generate_slug
from app.services.hours_service import compute_open_status, get_weekly_schedule_display, vendor_open_on_day_at_time

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


def _enrich_vendor(vendor: Vendor, db: Session, user=None, user_lat=None, user_lng=None) -> dict:
    """Attach computed fields to a vendor dict."""
    tags = [t.tag for t in vendor.tags]
    photos = vendor.photos

    # Hours
    weekly = db.query(VendorHoursWeekly).filter(VendorHoursWeekly.vendor_id == vendor.id).all()
    exceptions = db.query(VendorHoursException).filter(VendorHoursException.vendor_id == vendor.id).all()
    open_status = compute_open_status(vendor.id, vendor.timezone, weekly, exceptions)
    schedule = get_weekly_schedule_display(vendor.id, vendor.timezone, weekly, exceptions)

    distance = None
    if user_lat is not None and user_lng is not None and vendor.latitude and vendor.longitude:
        distance = haversine_distance(user_lat, user_lng, vendor.latitude, vendor.longitude)

    is_favorited = False
    if user:
        fav = db.query(Favorite).filter(
            Favorite.user_id == user.id, Favorite.vendor_id == vendor.id
        ).first()
        is_favorited = fav is not None

    return {
        **{c.name: getattr(vendor, c.name) for c in vendor.__table__.columns},
        "tags": tags,
        "photos": [{"id": p.id, "url": p.url, "caption": p.caption, "is_cover": p.is_cover, "sort_order": p.sort_order} for p in photos],
        "is_open": open_status.is_open,
        "open_status_label": open_status.status_label,
        "closes_at": open_status.closes_at,
        "opens_at": open_status.opens_at,
        "next_open_day": open_status.next_open_day,
        "weekly_schedule": schedule,
        "distance_miles": round(distance, 2) if distance is not None else None,
        "is_favorited": is_favorited,
    }


@router.get("/search", response_model=List[VendorSummary])
def search_vendors(
    q: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[str] = None,          # comma-separated
    open_now: Optional[bool] = None,
    open_day: Optional[int] = None,       # 0=Mon…6=Sun
    open_time: Optional[str] = None,      # "HH:MM"
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    distance_miles: Optional[float] = 25.0,
    sort_by: Optional[str] = "trending",  # trending | rating | distance | newest
    limit: int = Query(default=30, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Vendor).filter(Vendor.status == VendorStatus.active)

    # Text search
    if q:
        query = query.filter(
            Vendor.name.ilike(f"%{q}%") |
            Vendor.description.ilike(f"%{q}%") |
            Vendor.city.ilike(f"%{q}%")
        )

    # Category filter
    if category:
        query = query.filter(Vendor.category == category)

    # Tag filter
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        query = query.join(VendorTag).filter(VendorTag.tag.in_(tag_list))

    # Bounding box pre-filter by distance
    if lat is not None and lng is not None and distance_miles:
        min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, distance_miles)
        query = query.filter(
            Vendor.latitude.between(min_lat, max_lat),
            Vendor.longitude.between(min_lng, max_lng),
        )

    vendors = query.all()

    # Post-filter with precise haversine + hours check
    result = []
    for v in vendors:
        distance = None
        if lat is not None and lng is not None and v.latitude and v.longitude:
            distance = haversine_distance(lat, lng, v.latitude, v.longitude)
            if distance_miles and distance > distance_miles:
                continue

        # Load hours once
        weekly = db.query(VendorHoursWeekly).filter(VendorHoursWeekly.vendor_id == v.id).all()
        exceptions = db.query(VendorHoursException).filter(VendorHoursException.vendor_id == v.id).all()
        open_status = compute_open_status(v.id, v.timezone, weekly, exceptions)

        # Open now filter
        if open_now is True and not open_status.is_open:
            continue
        if open_now is False and open_status.is_open:
            continue

        # Open on specific day/time filter
        if open_day is not None or open_time is not None:
            check_day = open_day if open_day is not None else datetime.now().weekday()
            check_time = open_time if open_time is not None else datetime.now().strftime("%H:%M")
            if not vendor_open_on_day_at_time(v.id, v.timezone, weekly, exceptions, check_day, check_time):
                continue

        tags_list = [t.tag for t in v.tags]
        result.append({
            "id": v.id,
            "name": v.name,
            "slug": v.slug,
            "category": v.category,
            "status": v.status,
            "city": v.city,
            "state": v.state,
            "latitude": v.latitude,
            "longitude": v.longitude,
            "average_rating": v.average_rating or 0.0,
            "review_count": v.review_count or 0,
            "favorite_count": v.favorite_count or 0,
            "cover_photo_url": v.cover_photo_url,
            "tags": tags_list,
            "distance_miles": round(distance, 2) if distance is not None else None,
            "is_open": open_status.is_open,
            "open_status_label": open_status.status_label,
        })

    # Sort
    if sort_by == "rating":
        result.sort(key=lambda x: x["average_rating"], reverse=True)
    elif sort_by == "distance" and lat is not None:
        result.sort(key=lambda x: (x["distance_miles"] is None, x["distance_miles"] or 0))
    elif sort_by == "newest":
        pass  # already fetched newest first via DB default
    else:  # trending
        result.sort(
            key=lambda x: (not x["is_open"], -(x["average_rating"] * 0.4 + (x["review_count"] * 0.1))),
        )

    return result[offset : offset + limit]


@router.get("/featured", response_model=List[VendorSummary])
def featured_vendors(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    vendors = (
        db.query(Vendor)
        .filter(Vendor.status == VendorStatus.active)
        .order_by(Vendor.is_featured.desc(), Vendor.trending_score.desc())
        .limit(limit * 3)
        .all()
    )

    result = []
    for v in vendors:
        weekly = db.query(VendorHoursWeekly).filter(VendorHoursWeekly.vendor_id == v.id).all()
        exceptions = db.query(VendorHoursException).filter(VendorHoursException.vendor_id == v.id).all()
        open_status = compute_open_status(v.id, v.timezone, weekly, exceptions)
        distance = None
        if lat and lng and v.latitude and v.longitude:
            distance = haversine_distance(lat, lng, v.latitude, v.longitude)

        result.append({
            "id": v.id, "name": v.name, "slug": v.slug, "category": v.category,
            "status": v.status, "city": v.city, "state": v.state,
            "latitude": v.latitude, "longitude": v.longitude,
            "average_rating": v.average_rating or 0.0, "review_count": v.review_count or 0,
            "favorite_count": v.favorite_count or 0, "cover_photo_url": v.cover_photo_url,
            "tags": [t.tag for t in v.tags],
            "distance_miles": round(distance, 2) if distance else None,
            "is_open": open_status.is_open,
            "open_status_label": open_status.status_label,
        })

    return result[:limit]


@router.get("/{slug}", response_model=VendorRead)
def get_vendor(
    slug: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = Depends(get_db),
):
    vendor = db.query(Vendor).filter(Vendor.slug == slug).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return _enrich_vendor(vendor, db, None, lat, lng)


@router.post("", response_model=VendorRead, status_code=201)
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_vendor_or_admin),
):
    # Generate unique slug
    base_slug = generate_slug(payload.name)
    slug = base_slug
    counter = 1
    while db.query(Vendor).filter(Vendor.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    vendor = Vendor(
        owner_id=current_user.id,
        slug=slug,
        **{k: v for k, v in payload.model_dump(exclude={"tags"}).items()},
    )
    db.add(vendor)
    db.flush()

    # Tags
    for tag in (payload.tags or []):
        db.add(VendorTag(vendor_id=vendor.id, tag=tag.lower().strip()))

    db.commit()
    db.refresh(vendor)
    return _enrich_vendor(vendor, db, current_user)


@router.patch("/{vendor_id}", response_model=VendorRead)
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if current_user.role != UserRole.admin and vendor.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    data = payload.model_dump(exclude_unset=True)
    tags = data.pop("tags", None)

    for k, v in data.items():
        setattr(vendor, k, v)

    if tags is not None:
        db.query(VendorTag).filter(VendorTag.vendor_id == vendor_id).delete()
        for tag in tags:
            db.add(VendorTag(vendor_id=vendor_id, tag=tag.lower().strip()))

    db.commit()
    db.refresh(vendor)
    return _enrich_vendor(vendor, db, current_user)


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(vendor)
    db.commit()
