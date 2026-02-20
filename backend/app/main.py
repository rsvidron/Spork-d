from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import Base, engine
from app.api import auth, vendors, hours, reviews, favorites, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables after the event loop starts, not at import time.
    # Prevents crash if DB connection isn't ready during module load.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Spork'd API",
    description="Discover local food trucks, pop-ups, and vendors near you.",
    version="1.0.0",
    lifespan=lifespan,
)

# allow_origins=["*"] so Railway frontend URLs work without needing
# FRONTEND_URL configured upfront.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
