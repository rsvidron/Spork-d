from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.vendor import VendorCategory, VendorStatus


class PhotoRead(BaseModel):
    id: int
    url: str
    caption: Optional[str]
    is_cover: bool
    sort_order: int

    class Config:
        from_attributes = True


class VendorCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: VendorCategory
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: str = "America/New_York"
    phone: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    tags: Optional[List[str]] = []
    cover_photo_url: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[VendorCategory] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    tags: Optional[List[str]] = None
    cover_photo_url: Optional[str] = None
    status: Optional[VendorStatus] = None


class VendorSummary(BaseModel):
    """Lightweight vendor card for feeds and search results."""
    id: int
    name: str
    slug: str
    category: VendorCategory
    status: VendorStatus
    city: Optional[str]
    state: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    average_rating: float
    review_count: int
    favorite_count: int
    cover_photo_url: Optional[str]
    tags: List[str] = []
    distance_miles: Optional[float] = None
    is_open: Optional[bool] = None
    open_status_label: Optional[str] = None

    class Config:
        from_attributes = True


class VendorRead(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    category: VendorCategory
    status: VendorStatus
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    timezone: str
    phone: Optional[str]
    website: Optional[str]
    instagram: Optional[str]
    twitter: Optional[str]
    facebook: Optional[str]
    average_rating: float
    review_count: int
    favorite_count: int
    trending_score: float
    is_featured: bool
    cover_photo_url: Optional[str]
    created_at: datetime
    photos: List[PhotoRead] = []
    tags: List[str] = []
    is_open: Optional[bool] = None
    open_status_label: Optional[str] = None
    closes_at: Optional[str] = None
    opens_at: Optional[str] = None
    next_open_day: Optional[str] = None
    weekly_schedule: Optional[list] = None

    class Config:
        from_attributes = True
