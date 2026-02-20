from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "vendor_id", name="uq_user_vendor_review"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    rating = Column(Integer, nullable=False)   # 1–5
    body = Column(Text)
    is_hidden = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="reviews")
    vendor = relationship("Vendor", back_populates="reviews")
    flags = relationship("ReviewFlag", back_populates="review", cascade="all, delete-orphan")


class ReviewFlag(Base):
    __tablename__ = "review_flags"
    __table_args__ = (
        UniqueConstraint("user_id", "review_id", name="uq_user_review_flag"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False)
    reason = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="review_flags")
    review = relationship("Review", back_populates="flags")
