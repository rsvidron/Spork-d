from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.api import auth, vendors, hours, reviews, favorites, admin

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Spork'd API",
    description="Discover local food trucks, pop-ups, and vendors near you.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(vendors.router)
app.include_router(hours.router)
app.include_router(reviews.router)
app.include_router(favorites.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Spork'd API"}


@app.get("/api/config/map")
def map_config():
    """Return public map config to the frontend."""
    return {
        "mapbox_token": settings.MAPBOX_TOKEN,
    }
