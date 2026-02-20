"""
Pittsburgh seed script — populates Spork'd with Pittsburgh-area demo vendors.
Run: python seed_pittsburgh.py
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
from sqlalchemy import func

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Users ─────────────────────────────────────────────────────────────────────
print("Seeding users...")
users_data = [
    {"email": "admin@sporkd.app", "username": "admin", "password": "Admin1234!", "role": UserRole.admin, "full_name": "Admin User"},
    {"email": "pierogiqueen@example.com", "username": "pierogiqueen", "password": "Password1!", "role": UserRole.vendor, "full_name": "Maria Kowalski"},
    {"email": "yinzer_eats@example.com", "username": "yinzer_eats", "password": "Password1!", "role": UserRole.vendor, "full_name": "Tony DiMaggio"},
    {"email": "burgh_foodie@example.com", "username": "burgh_foodie", "password": "Password1!", "role": UserRole.user, "full_name": "Casey Petroski"},
    {"email": "northside_nancy@example.com", "username": "northside_nancy", "password": "Password1!", "role": UserRole.user, "full_name": "Nancy Fitzgerald"},
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

# ── Vendors ───────────────────────────────────────────────────────────────────
print("Seeding Pittsburgh vendors...")
vendors_data = [
    {
        "name": "Steel City Pierogi Truck",
        "description": "Hand-crafted pierogis stuffed with potato & cheddar, sauerkraut & mushroom, and seasonal specials. A Pittsburgh tradition on wheels.",
        "category": VendorCategory.food_truck,
        "address": "Market Square", "city": "Pittsburgh", "state": "PA", "zip_code": "15222",
        "latitude": 40.4415, "longitude": -79.9997, "timezone": "America/New_York",
        "phone": "+14125550101", "instagram": "@steelcitypierogi",
        "tags": ["pierogis", "polish", "comfort-food", "vegetarian-options"],
        "cover_photo_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
        "owner": "pierogiqueen",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800", "caption": "Fresh pierogis", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "11:00", "end": "15:00", "idx": 0} for d in range(0, 5)],
            {"dow": 5, "start": "11:00", "end": "20:00", "idx": 0},
            {"dow": 6, "start": "10:00", "end": "16:00", "idx": 0},
        ],
        "exceptions": [],
    },
    {
        "name": "Primanti's On the Go",
        "description": "The legendary Primanti's sandwich experience — coleslaw and fries piled right on the sandwich. Pittsburgh's most iconic bite, now mobile.",
        "category": VendorCategory.food_truck,
        "address": "Strip District", "city": "Pittsburgh", "state": "PA", "zip_code": "15222",
        "latitude": 40.4468, "longitude": -79.9810, "timezone": "America/New_York",
        "phone": "+14125550202", "instagram": "@primantisonthego",
        "tags": ["sandwiches", "pittsburgh-style", "coleslaw", "iconic"],
        "cover_photo_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
        "owner": "yinzer_eats",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", "caption": "Pittsburgh-style sandwich", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "10:00", "end": "22:00", "idx": 0} for d in range(0, 7)],
        ],
        "exceptions": [],
    },
    {
        "name": "Three Rivers Taco Co.",
        "description": "Authentic street tacos with a Pittsburgh twist. Al pastor, carnitas, and our famous 'Terrible Taco' with sriracha and pierogi filling.",
        "category": VendorCategory.food_truck,
        "address": "South Side Flats", "city": "Pittsburgh", "state": "PA", "zip_code": "15203",
        "latitude": 40.4282, "longitude": -79.9730, "timezone": "America/New_York",
        "phone": "+14125550303", "instagram": "@threeriverstaco",
        "tags": ["tacos", "mexican", "fusion", "street-food", "spicy"],
        "cover_photo_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
        "owner": "pierogiqueen",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800", "caption": "Street tacos", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "11:00", "end": "21:00", "idx": 0} for d in range(1, 6)],
            {"dow": 5, "start": "11:00", "end": "23:00", "idx": 0},
            {"dow": 6, "start": "12:00", "end": "22:00", "idx": 0},
        ],
        "exceptions": [],
    },
    {
        "name": "Lawrenceville Lobster Roll",
        "description": "Fresh Maine lobster rolls, crab bisque, and New England-style seafood in the heart of Pittsburgh's trendiest neighborhood.",
        "category": VendorCategory.food_truck,
        "address": "Butler Street, Lawrenceville", "city": "Pittsburgh", "state": "PA", "zip_code": "15201",
        "latitude": 40.4651, "longitude": -79.9601, "timezone": "America/New_York",
        "phone": "+14125550404", "instagram": "@lvlobsterroll",
        "tags": ["seafood", "lobster", "new-england", "upscale"],
        "cover_photo_url": "https://images.unsplash.com/photo-1559742811-822873691df8?w=800",
        "owner": "yinzer_eats",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1559742811-822873691df8?w=800", "caption": "Fresh lobster roll", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "11:30", "end": "19:00", "idx": 0} for d in range(2, 7)],
        ],
        "exceptions": [],
    },
    {
        "name": "Mon Wharf Smokehouse",
        "description": "Slow-smoked BBQ with a view of the Monongahela. Brisket, pulled pork, and smoked mac & cheese parked along the riverfront trail.",
        "category": VendorCategory.food_truck,
        "address": "Mon Wharf, Downtown", "city": "Pittsburgh", "state": "PA", "zip_code": "15222",
        "latitude": 40.4360, "longitude": -80.0020, "timezone": "America/New_York",
        "phone": "+14125550505", "instagram": "@monwharfsmoke",
        "tags": ["bbq", "smoked-meats", "brisket", "riverfront"],
        "cover_photo_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
        "owner": "pierogiqueen",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800", "caption": "Slow-smoked brisket", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "11:00", "end": "15:00", "idx": 0} for d in range(0, 5)],
            {"dow": 5, "start": "11:00", "end": "20:00", "idx": 0},
            {"dow": 6, "start": "11:00", "end": "20:00", "idx": 0},
        ],
        "exceptions": [],
    },
    {
        "name": "Schenley Park Crepes",
        "description": "Sweet and savory crepes made to order in Pittsburgh's most beloved park. Try the Nutella & banana or the ham & gruyere.",
        "category": VendorCategory.popup,
        "address": "Schenley Park, Flagstaff Hill", "city": "Pittsburgh", "state": "PA", "zip_code": "15213",
        "latitude": 40.4376, "longitude": -79.9500, "timezone": "America/New_York",
        "phone": "+14125550606", "instagram": "@schenleycrepes",
        "tags": ["crepes", "french", "sweet", "savory", "park"],
        "cover_photo_url": "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800",
        "owner": "yinzer_eats",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=800", "caption": "Fresh crepes", "is_cover": True},
        ],
        "hours": [
            {"dow": 5, "start": "10:00", "end": "17:00", "idx": 0},
            {"dow": 6, "start": "10:00", "end": "17:00", "idx": 0},
        ],
        "exceptions": [],
    },
    {
        "name": "Oakland Curry House",
        "description": "Indian street food near Pitt and CMU. Chana masala, samosas, and mango lassi. Student-friendly prices.",
        "category": VendorCategory.food_truck,
        "address": "Forbes Avenue, Oakland", "city": "Pittsburgh", "state": "PA", "zip_code": "15213",
        "latitude": 40.4444, "longitude": -79.9556, "timezone": "America/New_York",
        "phone": "+14125550707", "instagram": "@oaklandcurryhouse",
        "tags": ["indian", "curry", "vegetarian", "student-friendly", "halal"],
        "cover_photo_url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800",
        "owner": "pierogiqueen",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800", "caption": "Chana masala", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "11:00", "end": "20:00", "idx": 0} for d in range(0, 5)],
        ],
        "exceptions": [],
    },
    {
        "name": "PGH Cold Brew Cart",
        "description": "Local cold brew, nitro coffee, and specialty lattes. Sourcing beans from Pittsburgh roasters. Find us at farmers markets and pop-ups.",
        "category": VendorCategory.popup,
        "address": "Strip District Farmers Market", "city": "Pittsburgh", "state": "PA", "zip_code": "15222",
        "latitude": 40.4490, "longitude": -79.9840, "timezone": "America/New_York",
        "phone": "+14125550808", "instagram": "@pghcoldbrew",
        "tags": ["coffee", "cold-brew", "nitro", "local", "farmers-market"],
        "cover_photo_url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800",
        "owner": "yinzer_eats",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800", "caption": "Nitro cold brew", "is_cover": True},
        ],
        "hours": [
            {"dow": 5, "start": "07:00", "end": "14:00", "idx": 0},
            {"dow": 6, "start": "07:00", "end": "14:00", "idx": 0},
        ],
        "exceptions": [],
    },
    {
        "name": "Yinzer's Jerk Shack",
        "description": "Jamaican jerk chicken, oxtail stew, and plantains with a Pittsburgh yinzer attitude. Best jerk in the 412.",
        "category": VendorCategory.food_truck,
        "address": "East Liberty", "city": "Pittsburgh", "state": "PA", "zip_code": "15206",
        "latitude": 40.4596, "longitude": -79.9292, "timezone": "America/New_York",
        "phone": "+14125550909", "instagram": "@yinzerjerkshack",
        "tags": ["jamaican", "jerk", "caribbean", "spicy", "oxtail"],
        "cover_photo_url": "https://images.unsplash.com/photo-1532347922424-9d767efdb11c?w=800",
        "owner": "pierogiqueen",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1532347922424-9d767efdb11c?w=800", "caption": "Jerk chicken platter", "is_cover": True},
        ],
        "hours": [
            *[{"dow": d, "start": "12:00", "end": "20:00", "idx": 0} for d in range(2, 7)],
        ],
        "exceptions": [],
    },
    {
        "name": "North Shore Nacho Bar",
        "description": "Loaded nachos, walking tacos, and game-day grub right outside PNC Park and Acrisure Stadium. The ultimate pre-game stop.",
        "category": VendorCategory.food_truck,
        "address": "Federal Street, North Shore", "city": "Pittsburgh", "state": "PA", "zip_code": "15212",
        "latitude": 40.4468, "longitude": -80.0076, "timezone": "America/New_York",
        "phone": "+14125551010", "instagram": "@northshorenachos",
        "tags": ["nachos", "game-day", "tex-mex", "stadium", "casual"],
        "cover_photo_url": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800",
        "owner": "yinzer_eats",
        "photos": [
            {"url": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800", "caption": "Loaded nachos", "is_cover": True},
        ],
        "hours": [
            # Open game days + weekends
            {"dow": 4, "start": "16:00", "end": "22:00", "idx": 0},
            {"dow": 5, "start": "11:00", "end": "22:00", "idx": 0},
            {"dow": 6, "start": "11:00", "end": "22:00", "idx": 0},
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

# ── Reviews ───────────────────────────────────────────────────────────────────
print("Seeding reviews...")
reviews_data = [
    {"user": "burgh_foodie", "vendor": "Steel City Pierogi Truck", "rating": 5, "body": "Best pierogis outside of my babcia's kitchen. The sauerkraut & mushroom is incredible!"},
    {"user": "northside_nancy", "vendor": "Steel City Pierogi Truck", "rating": 5, "body": "A Pittsburgh staple. Always fresh, always delicious. The seasonal specials are worth the wait."},
    {"user": "burgh_foodie", "vendor": "Primanti's On the Go", "rating": 5, "body": "The real deal. Coleslaw on the sandwich is not negotiable and they nail it every time."},
    {"user": "northside_nancy", "vendor": "Three Rivers Taco Co.", "rating": 4, "body": "The Terrible Taco is wild but somehow works. Great fusion concept."},
    {"user": "burgh_foodie", "vendor": "Three Rivers Taco Co.", "rating": 5, "body": "Best tacos in Pittsburgh, no contest. Al pastor is fire."},
    {"user": "northside_nancy", "vendor": "Lawrenceville Lobster Roll", "rating": 5, "body": "Didn't expect to find a lobster roll this good in PGH. Perfectly dressed, generous portion."},
    {"user": "burgh_foodie", "vendor": "Mon Wharf Smokehouse", "rating": 5, "body": "Eating brisket by the river is peak Pittsburgh living. Smoke ring was perfect."},
    {"user": "northside_nancy", "vendor": "Schenley Park Crepes", "rating": 4, "body": "Great weekend treat after a walk through the park. Nutella banana crepe was amazing."},
    {"user": "burgh_foodie", "vendor": "Oakland Curry House", "rating": 4, "body": "Perfect for a quick lunch between classes. Chana masala hits different when it's this good."},
    {"user": "northside_nancy", "vendor": "Yinzer's Jerk Shack", "rating": 5, "body": "The jerk chicken is smoky, spicy, and perfect. Plantains are a must-add."},
    {"user": "burgh_foodie", "vendor": "North Shore Nacho Bar", "rating": 4, "body": "Pre-game nachos are a tradition now. Loaded with toppings and great for groups."},
    {"user": "northside_nancy", "vendor": "PGH Cold Brew Cart", "rating": 5, "body": "Nitro cold brew is smooth as silk. Love that they support local roasters."},
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
for vendor in created_vendors.values():
    result = db.query(func.avg(Review.rating), func.count(Review.id)).filter(Review.vendor_id == vendor.id).first()
    vendor.average_rating = round(float(result[0] or 0), 2)
    vendor.review_count = result[1] or 0
    vendor.trending_score = vendor.average_rating * 0.5 + vendor.review_count * 0.1

db.commit()

# ── Favorites ─────────────────────────────────────────────────────────────────
print("Seeding favorites...")
for user_key, vendor_key in [
    ("burgh_foodie", "Steel City Pierogi Truck"),
    ("burgh_foodie", "Three Rivers Taco Co."),
    ("burgh_foodie", "Mon Wharf Smokehouse"),
    ("northside_nancy", "Steel City Pierogi Truck"),
    ("northside_nancy", "Lawrenceville Lobster Roll"),
    ("northside_nancy", "PGH Cold Brew Cart"),
]:
    user = created_users.get(user_key)
    vendor = created_vendors.get(vendor_key)
    if user and vendor:
        if not db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.vendor_id == vendor.id).first():
            db.add(Favorite(user_id=user.id, vendor_id=vendor.id))
            vendor.favorite_count = (vendor.favorite_count or 0) + 1

db.commit()
db.close()

print("✅ Pittsburgh seed complete! 10 vendors added.")
print("\nTest accounts:")
print("  Admin:  admin@sporkd.app / Admin1234!")
print("  Vendor: pierogiqueen@example.com / Password1!")
print("  Vendor: yinzer_eats@example.com / Password1!")
print("  User:   burgh_foodie@example.com / Password1!")
print("  User:   northside_nancy@example.com / Password1!")
