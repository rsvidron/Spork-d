from pydantic import BaseModel
from datetime import datetime


class FavoriteRead(BaseModel):
    id: int
    user_id: int
    vendor_id: int
    created_at: datetime

    class Config:
        from_attributes = True
