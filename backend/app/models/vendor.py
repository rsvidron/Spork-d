from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float,
    Text, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class VendorCategory(str, enum.Enum):
    food_truck = "food_truck"
    popup = "popup"
    bar = "bar"
    market_stall = "market_stall"
    cart = "cart"
    other = "other"


class VendorStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    suspended = "suspended"
    inactive = "inactive"


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, index=True)
    description = Column(Text)
    category = Column(Enum(VendorCategory), nullable=False)
    status = Column(Enum(VendorStatus), default=VendorStatus.pending)

    # Location
    address = Column(String)
    city = Column(String, index=True)
    state = Column(String)
    zip_code = Column(String)
    country = Column(String, default="US")
    latitude = Column(Float, index=True)
    longitude = Column(Float, index=True)
    timezone = Column(String, default="America/New_York", nullable=False)

    # Contact / Social
    phone = Column(String)
    website = Column(String)
    instagram = Column(String)
    twitter = Column(String)
    facebook = Column(String)

    # Computed / Cached stats
    average_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    favorite_count = Column(Integer, default=0)
    trending_score = Column(Float, default=0.0)

    is_featured = Column(Boolean, default=False)
    cover_photo_url = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="vendors")
    photos = relationship("VendorPhoto", back_populates="vendor", cascade="all, delete-orphan")
    tags = relationship("VendorTag", back_populates="vendor", cascade="all, delete-orphan")
    weekly_hours = relationship("VendorHoursWeekly", back_populates="vendor", cascade="all, delete-orphan")
    hour_exceptions = relationship("VendorHoursException", back_populates="vendor", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="vendor", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="vendor", cascade="all, delete-orphan")


class VendorPhoto(Base):
    __tablename__ = "vendor_photos"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    url = Column(String, nullable=False)
    caption = Column(String)
    is_cover = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vendor = relationship("Vendor", back_populates="photos")


class VendorTag(Base):
    __tablename__ = "vendor_tags"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    tag = Column(String, nullable=False, index=True)

    vendor = relationship("Vendor", back_populates="tags")
