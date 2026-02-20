from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.review import Review, ReviewFlag
from app.models.vendor import Vendor
from app.models.user import User, UserRole
from app.schemas.review import ReviewCreate, ReviewRead, ReviewUpdate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/vendors/{vendor_id}/reviews", tags=["reviews"])


def _to_read(review: Review, db: Session) -> dict:
    return {
        "id": review.id,
        "user_id": review.user_id,
        "vendor_id": review.vendor_id,
        "rating": review.rating,
        "body": review.body,
        "is_hidden": review.is_hidden,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
        "username": review.user.username if review.user else None,
        "avatar_url": review.user.avatar_url if review.user else None,
        "flag_count": len(review.flags),
    }


@router.get("", response_model=List[ReviewRead])
def get_reviews(
    vendor_id: int,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Optional[User] = None,
):
    query = db.query(Review).filter(Review.vendor_id == vendor_id)
    # Admins see hidden reviews too
    if not current_user or current_user.role != UserRole.admin:
        query = query.filter(Review.is_hidden == False)
    reviews = query.order_by(Review.created_at.desc()).offset(offset).limit(limit).all()
    return [_to_read(r, db) for r in reviews]


@router.post("", response_model=ReviewRead, status_code=201)
def create_review(
    vendor_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    existing = db.query(Review).filter(
        Review.vendor_id == vendor_id, Review.user_id == current_user.id
    ).first()
    if existing:
        # Update existing review
        existing.rating = payload.rating
        existing.body = payload.body
        db.commit()
        db.refresh(existing)
        _update_vendor_rating(vendor, db)
        return _to_read(existing, db)

    review = Review(vendor_id=vendor_id, user_id=current_user.id, **payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    _update_vendor_rating(vendor, db)
    return _to_read(review, db)


@router.patch("/{review_id}", response_model=ReviewRead)
def update_review(
    vendor_id: int,
    review_id: int,
    payload: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = db.query(Review).filter(Review.id == review_id, Review.vendor_id == vendor_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(review, k, v)
    db.commit()
    db.refresh(review)

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    _update_vendor_rating(vendor, db)
    return _to_read(review, db)


@router.delete("/{review_id}", status_code=204)
def delete_review(
    vendor_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = db.query(Review).filter(Review.id == review_id, Review.vendor_id == vendor_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(review)
    db.commit()

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if vendor:
        _update_vendor_rating(vendor, db)


@router.post("/{review_id}/flag", status_code=201)
def flag_review(
    vendor_id: int,
    review_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    existing = db.query(ReviewFlag).filter(
        ReviewFlag.review_id == review_id, ReviewFlag.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already flagged")

    flag = ReviewFlag(review_id=review_id, user_id=current_user.id, reason=reason)
    db.add(flag)
    db.commit()
    return {"message": "Review flagged"}


def _update_vendor_rating(vendor: Vendor, db: Session):
    """Recompute and cache vendor's average rating and review count."""
    from sqlalchemy import func
    result = db.query(
        func.avg(Review.rating), func.count(Review.id)
    ).filter(
        Review.vendor_id == vendor.id, Review.is_hidden == False
    ).first()
    vendor.average_rating = round(float(result[0] or 0), 2)
    vendor.review_count = result[1] or 0
    vendor.trending_score = vendor.average_rating * 0.5 + (vendor.review_count * 0.1)
    db.commit()
