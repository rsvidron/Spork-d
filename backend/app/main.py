import os
import sys

# Print all env vars at startup so we can see what Railway is injecting
print("=== STARTUP ENV DEBUG ===", flush=True)
for key in ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "DATABASE_URL", "PORT"]:
    val = os.environ.get(key)
    if val:
        # Mask password but confirm it's present
        masked = val if key not in ("PGPASSWORD",) else "***set***"
        print(f"  {key} = {masked}", flush=True)
    else:
        print(f"  {key} = NOT SET", flush=True)
print("=========================", flush=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import Base, engine
from app.api import auth, vendors, hours, reviews, favorites, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[lifespan] Connecting with URL: {settings.get_database_url()[:40]}...", flush=True)
    try:
        Base.metadata.create_all(bind=engine)
        print("[lifespan] DB tables created/verified OK", flush=True)
    except Exception as e:
        print(f"[lifespan] DB ERROR: {e}", flush=True)
        # Don't crash — let the healthcheck fail gracefully so logs are visible
    yield


app = FastAPI(
    title="Spork'd API",
    description="Discover local food trucks, pop-ups, and vendors near you.",
    version="1.0.0",
    lifespan=lifespan,
)

_frontend_url = os.environ.get("FRONTEND_URL", "https://sporkd-production.up.railway.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"mapbox_token": settings.MAPBOX_TOKEN}
