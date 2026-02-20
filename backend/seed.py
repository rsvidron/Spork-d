"""
Seed script — populates Spork'd with demo data.
Run: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.vendor import Vendor, VendorCategory, VendorStatus, VendorTag, VendorPhoto
from app.models.hours import VendorHoursWeekly, VendorHoursException
from app.models.review import Review
from app.models.favorite import Favorite
from app.utils.auth import get_password_hash
from app.utils.geo import generate_slug
from datetime import date

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Users ────────────────────────────────────────────────────────────────────
print("Seeding users...")
users_data = [
    {"email": "admin@sporkd.app", "username": "admin", "password": "Admin1234!", "role": UserRole.admin, "full_name": "Admin User"},
    {"email": "alice@example.com", "username": "alice", "password": "Password1!", "role": UserRole.vendor, "full_name": "Alice Chen"},
    {"email": "bob@example.com", "username": "bob", "password": "Password1!", "role": UserRole.vendor, "full_name": "Bob Martinez"},
    {"email": "carol@example.com", "username": "carol", "password": "Password1!", "role": UserRole.user, "full_name": "Carol Davis"},
    {"email": "dave@example.com", "username": "dave", "password": "Password1!", "role": UserRole.user, "full_name": "Dave Johnson"},
]
created_users = {}
for ud in users_data:
    existing = db.query(User).filter(User.email == ud["email"]).first()
    if not existing:
        user = User(
            email=ud["email"], username=ud["username"],
            hashed_password=get_password_hash(ud["password"]),
            full_name=ud["full_name"], role=ud["role"],
            is_active=True, is_verified=True,
        )
        db.add(user)
        db.flush()
        created_users[ud["username"]] = user
    else:
        created_users[ud["username"]] = existing

db.commit()

# ── Vendors ──────────────────────────────────────────────────────────────────
print("Seeding vendors...")
vendors_data = [
    {
        "name": "Smoky Wheels BBQ",
        "description": "Award-winning Texas-style BBQ brisket, ribs, and pulled pork. We slow-smoke everything overnight for maximum flavor.",
        "category": VendorCategory.food_truck,
        "address": "500 Broadway", "city": "Nashville", "state": "TN", "zip_code": "37203",
        "latitude": 36.1596, "longitude": -86.7789, "timezone": "America/Chicago",
        "phone": "+16155550101", "instagram": "@smokywheelsbbq",
        "tags": ["bbq", "southern", "smoked-meats", "ribs"],
        "cover_photo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
        "owner": "alice",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800", "caption": "Our amazing brisket", "is_cover": True},
            {"url": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800", "caption": "Smoky ribs"},
        ],
        "hours": [
            # Mon–Fri lunch only
            *[{"dow": d, "start": "11:00", "end": "15:00", "idx": 0} for d in range(0, 5)],
            # Fri also dinner
            {"dow": 4, "start": "17:00", "end": "21:00", "idx": 1},
            # Sat all day
            {"dow": 5, "start": "10:00", "end": "22:00", "idx": 0},
            # Sun closed — no entry
        ],
        "exceptions": [
            {"date": date(2025, 12, 25), "closed": True, "note": "Christmas closure"},
        ],
    },
    {
        "name": "Taco Libre",
        "description": "Authentic Mexican street tacos, tortas, and horchata. Family recipes from Oaxaca.",
        "category": VendorCategory.food_truck,
        "address": "200 S Lamar Blvd", "city": "Austin", "state": "TX", "zip_code": "78704",
        "latitude": 30.2500, "longitude": -97.7500, "timezone": "America/Chicago",
        "phone": "+15125550202", "instagram": "@tacolibre_atx",
        "tags": ["mexican", "tacos", "street-food", "latin"],
        "cover_photo_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
        "owner": "bob",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800", "caption": "Street tacos", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "11:00", "end": "22:00", "idx": 0} for d in range(0, 7)],
        ],
        "exceptions": [],
    },
    {
        "name": "The Rolling Ramen",
        "description": "Rich tonkotsu broth, handmade noodles, and creative toppings. NYC's best ramen on wheels.",
        "category": VendorCategory.food_truck,
        "address": "W 14th St & 9th Ave", "city": "New York", "state": "NY", "zip_code": "10011",
        "latitude": 40.7410, "longitude": -74.0052, "timezone": "America/New_York",
        "phone": "+12125550303", "instagram": "@rollingramen",
        "tags": ["ramen", "japanese", "noodles", "soup"],
        "cover_photo_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
        "owner": "alice",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800", "caption": "Tonkotsu ramen", "is_cover": True},
        ],
        "hours": [
            # Tue–Sat lunch + dinner
            *[{"dow": d, "start": "11:30", "end": "15:00", "idx": 0} for d in range(1, 6)],
            *[{"dow": d, "start": "17:30", "end": "22:00", "idx": 1} for d in range(1, 6)],
            # Sun brunch
            {"dow": 6, "start": "12:00", "end": "18:00", "idx": 0},
        ],
        "exceptions": [],
    },
    {
        "name": "Vegan Vibes Pop-Up",
        "description": "100% plant-based burgers, wraps, and smoothies. Popping up at farmers markets and events every weekend.",
        "category": VendorCategory.popup,
        "address": "Ferry Building Marketplace", "city": "San Francisco", "state": "CA", "zip_code": "94111",
        "latitude": 37.7955, "longitude": -122.3937, "timezone": "America/Los_Angeles",
        "phone": "+14155550404", "instagram": "@veganvibessf",
        "tags": ["vegan", "plant-based", "healthy", "burgers"],
        "cover_photo_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
        "owner": "bob",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800", "caption": "Fresh bowls", "is_cover": True},
        ],
        "hours": [
            # Sat & Sun only
            {"dow": 5, "start": "09:00", "end": "15:00", "idx": 0},
            {"dow": 6, "start": "09:00", "end": "14:00", "idx": 0},
        ],
        "exceptions": [],
    },
    {
        "name": "Night Owl Bar Cart",
        "description": "Craft cocktails on wheels. Find us at events, rooftops, and Friday night markets.",
        "category": VendorCategory.bar,
        "address": "Pike Place Market", "city": "Seattle", "state": "WA", "zip_code": "98101",
        "latitude": 47.6090, "longitude": -122.3420, "timezone": "America/Los_Angeles",
        "phone": "+12065550505", "instagram": "@nightowlbarcart",
        "tags": ["cocktails", "bar", "craft-drinks", "nightlife"],
        "cover_photo_url": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800",
        "owner": "alice",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800", "caption": "Craft cocktails", "is_cover": True},
        ],
        "hours": [
            # Thu–Sat evenings
            {"dow": 3, "start": "17:00", "end": "23:00", "idx": 0},
            {"dow": 4, "start": "17:00", "end": "00:00", "idx": 0},
            {"dow": 5, "start": "17:00", "end": "02:00", "idx": 0},
        ],
        "exceptions": [],
    },
    {
        "name": "Seoul Street Bites",
        "description": "Korean-inspired street food: spicy rice cakes, Korean fried chicken, and bulgogi bowls.",
        "category": VendorCategory.food_truck,
        "address": "Midtown Farmers Market", "city": "Atlanta", "state": "GA", "zip_code": "30308",
        "latitude": 33.7830, "longitude": -84.3831, "timezone": "America/New_York",
        "phone": "+14045550606", "instagram": "@seoulstreet_atl",
        "tags": ["korean", "fried-chicken", "spicy", "bowls"],
        "cover_photo_url": "https://images.unsplash.com/photo-1532347922424-9d767efdb11c?w=800",
        "owner": "bob",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1532347922424-9d767efdb11c?w=800", "caption": "Korean fried chicken", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "11:00", "end": "20:00", "idx": 0} for d in range(0, 5)],
            {"dow": 5, "start": "10:00", "end": "21:00", "idx": 0},
        ],
        "exceptions": [],
    },
]

created_vendors = {}
for vd in vendors_data:
    existing = db.query(Vendor).filter(Vendor.name == vd["name"]).first()
    if existing:
        created_vendors[vd["name"]] = existing
        continue

    owner = created_users.get(vd["owner"])
    base_slug = generate_slug(vd["name"])
    slug = base_slug
    i = 1
    while db.query(Vendor).filter(Vendor.slug == slug).first():
        slug = f"{base_slug}-{i}"; i += 1

    vendor = Vendor(
        owner_id=owner.id if owner else None,
        name=vd["name"], slug=slug, description=vd["description"],
        category=vd["category"], status=VendorStatus.active,
        address=vd["address"], city=vd["city"], state=vd["state"],
        zip_code=vd["zip_code"], latitude=vd["latitude"], longitude=vd["longitude"],
        timezone=vd["timezone"], phone=vd.get("phone"),
        instagram=vd.get("instagram"), cover_photo_url=vd.get("cover_photo_url"),
        average_rating=0.0, review_count=0, favorite_count=0, trending_score=0.0,
    )
    db.add(vendor)
    db.flush()

    for tag in vd.get("tags", []):
        db.add(VendorTag(vendor_id=vendor.id, tag=tag))

    for idx, ph in enumerate(vd.get("photos", [])):
        db.add(VendorPhoto(vendor_id=vendor.id, url=ph["url"], caption=ph.get("caption"), is_cover=ph.get("is_cover", False), sort_order=idx))

    for h in vd.get("hours", []):
        db.add(VendorHoursWeekly(vendor_id=vendor.id, day_of_week=h["dow"], start_time_local=h["start"], end_time_local=h["end"], interval_index=h.get("idx", 0)))

    for exc in vd.get("exceptions", []):
        db.add(VendorHoursException(vendor_id=vendor.id, exception_date=exc["date"], is_closed=exc.get("closed", False), note=exc.get("note")))

    created_vendors[vd["name"]] = vendor

db.commit()

# ── Reviews ──────────────────────────────────────────────────────────────────
print("Seeding reviews...")
reviews_data = [
    {"user": "carol", "vendor": "Smoky Wheels BBQ", "rating": 5, "body": "Best BBQ I've ever had! The brisket was absolutely perfect."},
    {"user": "dave", "vendor": "Smoky Wheels BBQ", "rating": 4, "body": "Great ribs, a bit pricey but worth it."},
    {"user": "carol", "vendor": "Taco Libre", "rating": 5, "body": "Authentic Mexican flavors! The al pastor is unreal."},
    {"user": "dave", "vendor": "Taco Libre", "rating": 5, "body": "Incredible tacos every single time. Never misses."},
    {"user": "carol", "vendor": "The Rolling Ramen", "rating": 5, "body": "The tonkotsu broth is incredible. Worth the wait!"},
    {"user": "dave", "vendor": "Vegan Vibes Pop-Up", "rating": 4, "body": "Surprisingly filling and delicious for plant-based!"},
    {"user": "carol", "vendor": "Night Owl Bar Cart", "rating": 5, "body": "Creative cocktails and super friendly staff."},
    {"user": "dave", "vendor": "Seoul Street Bites", "rating": 4, "body": "Spicy and delicious! Love the Korean fried chicken."},
]
for rd in reviews_data:
    user = created_users.get(rd["user"])
    vendor = created_vendors.get(rd["vendor"])
    if not user or not vendor:
        continue
    existing = db.query(Review).filter(Review.user_id == user.id, Review.vendor_id == vendor.id).first()
    if not existing:
        db.add(Review(user_id=user.id, vendor_id=vendor.id, rating=rd["rating"], body=rd["body"]))

db.commit()

# Update vendor ratings
from sqlalchemy import func
for vendor in created_vendors.values():
    result = db.query(func.avg(Review.rating), func.count(Review.id)).filter(Review.vendor_id == vendor.id).first()
    vendor.average_rating = round(float(result[0] or 0), 2)
    vendor.review_count = result[1] or 0
    vendor.trending_score = vendor.average_rating * 0.5 + vendor.review_count * 0.1

db.commit()

# ── Favorites ────────────────────────────────────────────────────────────────
print("Seeding favorites...")
for user_key, vendor_key in [("carol", "Smoky Wheels BBQ"), ("carol", "Taco Libre"), ("dave", "The Rolling Ramen")]:
    user = created_users.get(user_key)
    vendor = created_vendors.get(vendor_key)
    if user and vendor:
        if not db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.vendor_id == vendor.id).first():
            db.add(Favorite(user_id=user.id, vendor_id=vendor.id))
            vendor.favorite_count = (vendor.favorite_count or 0) + 1

db.commit()
db.close()
print("✅ Seed complete!")
print("\nTest accounts:")
print("  Admin:  admin@sporkd.app / Admin1234!")
print("  Vendor: alice@example.com / Password1!")
print("  Vendor: bob@example.com / Password1!")
print("  User:   carol@example.com / Password1!")
print("  User:   dave@example.com / Password1!")
