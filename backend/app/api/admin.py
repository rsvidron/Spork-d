from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.vendor import Vendor, VendorStatus
from app.models.review import Review, ReviewFlag
from app.schemas.user import UserRead
from app.schemas.vendor import VendorSummary
from app.utils.auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=List[UserRead])
def list_users(
    q: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User)
    if q:
        query = query.filter(
            User.email.ilike(f"%{q}%") | User.username.ilike(f"%{q}%")
        )
    return query.offset(offset).limit(limit).all()


@router.patch("/users/{user_id}/disable")
def disable_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User disabled"}


@router.patch("/users/{user_id}/enable")
def enable_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    return {"message": "User enabled"}


@router.patch("/users/{user_id}/role")
def set_user_role(
    user_id: int,
    role: UserRole,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"message": f"Role updated to {role}"}


@router.get("/vendors")
def list_vendors(
    status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Vendor)
    if status:
        query = query.filter(Vendor.status == status)
    if q:
        query = query.filter(Vendor.name.ilike(f"%{q}%"))
    total = query.count()
    vendors = query.offset(offset).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": v.id, "name": v.name, "slug": v.slug,
                "status": v.status, "category": v.category,
                "city": v.city, "state": v.state,
                "average_rating": v.average_rating,
                "review_count": v.review_count,
            }
            for v in vendors
        ]
    }


@router.patch("/vendors/{vendor_id}/approve")
def approve_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.status = VendorStatus.active
    db.commit()
    return {"message": "Vendor approved"}


@router.patch("/vendors/{vendor_id}/suspend")
def suspend_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.status = VendorStatus.suspended
    db.commit()
    return {"message": "Vendor suspended"}


@router.patch("/vendors/{vendor_id}/feature")
def toggle_featured(
    vendor_id: int,
    featured: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.is_featured = featured
    db.commit()
    return {"message": f"Vendor featured={featured}"}


@router.get("/reviews/flagged")
def list_flagged_reviews(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    flagged_ids = (
        db.query(ReviewFlag.review_id)
        .group_by(ReviewFlag.review_id)
        .subquery()
    )
    reviews = (
        db.query(Review)
        .filter(Review.id.in_(flagged_ids))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id, "vendor_id": r.vendor_id, "user_id": r.user_id,
            "rating": r.rating, "body": r.body, "is_hidden": r.is_hidden,
            "created_at": r.created_at, "flag_count": len(r.flags),
            "username": r.user.username if r.user else None,
        }
        for r in reviews
    ]


@router.patch("/reviews/{review_id}/hide")
def hide_review(
    review_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_hidden = True
    db.commit()
    return {"message": "Review hidden"}


@router.patch("/reviews/{review_id}/unhide")
def unhide_review(
    review_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_hidden = False
    db.commit()
    return {"message": "Review unhidden"}


@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from app.models.favorite import Favorite
    return {
        "total_users": db.query(User).count(),
        "total_vendors": db.query(Vendor).count(),
        "active_vendors": db.query(Vendor).filter(Vendor.status == VendorStatus.active).count(),
        "pending_vendors": db.query(Vendor).filter(Vendor.status == VendorStatus.pending).count(),
        "total_reviews": db.query(Review).count(),
        "flagged_reviews": db.query(ReviewFlag).count(),
        "total_favorites": db.query(Favorite).count(),
    }
