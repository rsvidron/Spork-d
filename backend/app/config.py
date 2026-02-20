from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Individual PG vars — Railway Postgres plugin exposes these reliably.
    # DATABASE_URL is assembled from them if not explicitly provided.
    PGHOST: Optional[str] = None
    PGPORT: Optional[str] = "5432"
    PGUSER: Optional[str] = None
    PGPASSWORD: Optional[str] = None
    PGDATABASE: Optional[str] = None

    # Can still be set directly (local dev, other providers)
    DATABASE_URL: Optional[str] = None

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    MAPBOX_TOKEN: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: str = "sporkd-uploads"
    AWS_REGION: str = "us-east-1"

    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

    def get_database_url(self) -> str:
        """
        Build the database URL.
        Priority:
          1. DATABASE_URL env var (explicit override)
          2. Individual PG* vars (Railway Postgres plugin default)
          3. Local dev fallback
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.PGHOST and self.PGUSER and self.PGPASSWORD and self.PGDATABASE:
            return (
                f"postgresql://{self.PGUSER}:{self.PGPASSWORD}"
                f"@{self.PGHOST}:{self.PGPORT}/{self.PGDATABASE}"
            )
        return "postgresql://sporkd:sporkd@localhost:5432/sporkd"


settings = Settings()
