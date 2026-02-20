import sys
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

database_url = settings.get_database_url()
print(f"[database] Using URL: {database_url[:40]}...", flush=True)

try:
    engine = create_engine(
        database_url,
        pool_pre_ping=True,      # verify connection is alive before using it
        connect_args={"connect_timeout": 10},
    )
    print("[database] Engine created OK", flush=True)
except Exception as e:
    print(f"[database] Failed to create engine: {e}", flush=True)
    sys.exit(1)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
