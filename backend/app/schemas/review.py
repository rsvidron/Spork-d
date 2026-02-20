from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    rating: int
    body: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    body: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewRead(BaseModel):
    id: int
    user_id: int
    vendor_id: int
    rating: int
    body: Optional[str]
    is_hidden: bool
    created_at: datetime
    updated_at: Optional[datetime]
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    flag_count: int = 0

    class Config:
        from_attributes = True
