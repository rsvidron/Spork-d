# Spork'd

Discover local food trucks, pop-up bars, and vendors near you.
Inspired by DoorDash/Grubhub but focused entirely on **discovery**, not delivery.

---

## Features

| Feature | Details |
|---|---|
| **Discovery Feed** | Proximity + rating + trending feed |
| **Map View** | Interactive Mapbox map with vendor pins |
| **Search & Filters** | By name, category, tags, "Open now", "Open on Friday at 9 PM", distance |
| **Operating Hours** | Per-day multi-interval schedules, IANA timezone, DST-safe |
| **Special Hours** | Date-based overrides (holiday closures, extended hours) |
| **Open/Closed Status** | Accurate cross-timezone computation with "Closes at X" / "Opens at X" |
| **Reviews** | 1–5 star ratings, text reviews, edit/delete, flag |
| **Favorites** | Save and view favorite vendors |
| **Three Roles** | User, Vendor, Admin |
| **Vendor Dashboard** | Manage profile, hours, exceptions |
| **Admin Panel** | Approve vendors, manage users, moderate reviews |

---

## Tech Stack

- **Backend**: Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Auth**: JWT (python-jose + passlib bcrypt)
- **Timezone**: `pytz` — IANA timezone + DST-safe wall-clock time storage
- **Map**: Mapbox GL JS via `react-map-gl`

---

## Local Setup (without Docker)

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+

### 1. Clone & navigate

```bash
cd sporkd
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, optional MAPBOX_TOKEN

# Create database
createdb sporkd   # or use psql

# Start backend (tables created automatically on startup)
uvicorn app.main:app --reload --port 8000
```

### 3. Seed demo data

```bash
# With backend virtualenv active:
python seed.py
```

This creates:
- 5 test accounts (admin, 2 vendors, 2 users)
- 6 vendors across multiple US cities with full schedules
- Reviews and favorites

**Demo credentials:**
```
Admin:  admin@sporkd.app  /  Admin1234!
Vendor: alice@example.com     /  Password1!
User:   carol@example.com     /  Password1!
```

### 4. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_MAPBOX_TOKEN if you have a Mapbox account (free tier works)

# Start dev server
npm run dev
```

Frontend: http://localhost:3000
Backend API docs: http://localhost:8000/docs

---

## Docker Compose Setup

```bash
cd sporkd

# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# (Optional) Add your Mapbox token to backend/.env:
# MAPBOX_TOKEN=pk.your_token_here

# Start everything
docker compose up --build

# In a second terminal, seed data:
docker compose exec backend python seed.py
```

---

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| email | varchar unique | |
| username | varchar unique | |
| hashed_password | varchar | bcrypt |
| role | enum | user / vendor / admin |
| is_active | bool | |

### `vendors`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| slug | varchar unique | URL-safe name |
| category | enum | food_truck / popup / bar / market_stall / cart / other |
| latitude, longitude | float | for proximity search |
| timezone | varchar | IANA (e.g., America/New_York) |
| average_rating | float | cached, recomputed on review change |
| status | enum | pending / active / suspended / inactive |

### `vendor_hours_weekly`
| Column | Type | Notes |
|---|---|---|
| day_of_week | int | 0=Mon … 6=Sun |
| start_time_local | varchar(5) | "HH:MM" wall-clock in vendor tz |
| end_time_local | varchar(5) | "HH:MM" wall-clock |
| interval_index | int | supports multiple intervals per day |
| is_closed | bool | marks day as closed |

### `vendor_hours_exceptions`
| Column | Type | Notes |
|---|---|---|
| exception_date | date | specific calendar date |
| is_closed | bool | override: closed all day |
| start_time_local | varchar(5) | override hours |
| end_time_local | varchar(5) | |
| note | varchar | e.g., "Christmas closure" |

### `reviews`
| Column | Type | Notes |
|---|---|---|
| user_id | FK users | |
| vendor_id | FK vendors | |
| rating | int | 1–5 |
| body | text | |
| is_hidden | bool | admin can hide |
| UNIQUE(user_id, vendor_id) | | one review per user per vendor |

### `review_flags`
| Column | Type | Notes |
|---|---|---|
| user_id | FK users | |
| review_id | FK reviews | |
| reason | varchar | |
| UNIQUE(user_id, review_id) | | one flag per user per review |

### `favorites`
| Column | Type | Notes |
|---|---|---|
| user_id | FK users | |
| vendor_id | FK vendors | |
| UNIQUE(user_id, vendor_id) | | |

---

## API Endpoints

### Auth
```
POST /api/auth/register       Register new user
POST /api/auth/login          Login, returns JWT
GET  /api/auth/me             Current user info
```

### Vendors
```
GET  /api/vendors/search      Search with filters:
                              ?q=&category=&tags=&open_now=&open_day=&open_time=&lat=&lng=&distance_miles=&sort_by=
GET  /api/vendors/featured    Featured/trending vendors
GET  /api/vendors/{slug}      Vendor detail with open status + schedule
POST /api/vendors             Create vendor (vendor/admin)
PATCH /api/vendors/{id}       Update vendor
DELETE /api/vendors/{id}      Delete (admin only)
```

### Hours
```
GET  /api/vendors/{id}/hours/weekly           Get weekly schedule
PUT  /api/vendors/{id}/hours/weekly           Replace full weekly schedule
DELETE /api/vendors/{id}/hours/weekly         Clear schedule
GET  /api/vendors/{id}/hours/exceptions       Get exceptions
POST /api/vendors/{id}/hours/exceptions       Add exception
DELETE /api/vendors/{id}/hours/exceptions/{eid}
GET  /api/vendors/{id}/hours/status           Current open/closed status + next window
```

### Reviews
```
GET  /api/vendors/{id}/reviews
POST /api/vendors/{id}/reviews
PATCH /api/vendors/{id}/reviews/{rid}
DELETE /api/vendors/{id}/reviews/{rid}
POST /api/vendors/{id}/reviews/{rid}/flag
```

### Favorites
```
GET  /api/favorites
POST /api/favorites/{vendor_id}
DELETE /api/favorites/{vendor_id}
```

### Admin
```
GET  /api/admin/stats
GET  /api/admin/users
PATCH /api/admin/users/{id}/disable|enable|role
GET  /api/admin/vendors
PATCH /api/admin/vendors/{id}/approve|suspend|feature
GET  /api/admin/reviews/flagged
PATCH /api/admin/reviews/{id}/hide|unhide
```

---

## Timezone & DST Design

**The problem:** If you store hours as UTC offsets, a vendor set to "open 11AM–9PM ET" will
appear open at the wrong time during DST transitions (ET shifts between UTC-5 and UTC-4).

**The solution used in Spork'd:**

1. Each vendor has an IANA timezone (e.g., `America/New_York`).
2. Weekly hours are stored as **wall-clock local times** (`"11:00"`, `"21:00"`) — no UTC conversion.
3. Exception dates store the **calendar date** + local wall-clock times.
4. To compute "open now":
   - Convert `datetime.utcnow()` → vendor's local time using `pytz`
   - Compare the local `HH:MM` against stored intervals
5. This is correct across DST because `pytz.astimezone()` handles the offset change automatically.

**Search "Open Friday at 9 PM":**
- The user's input `19:00` (wall-clock) is compared directly against the vendor's stored schedule
- No timezone conversion needed for local-time comparisons (both in local terms)
- For cross-timezone precision, convert the user-specified time to the vendor's timezone first

---

## Map Setup (Optional)

1. Sign up at [mapbox.com](https://mapbox.com) (free tier: 50k map loads/month)
2. Create a public token
3. Add to `frontend/.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
   ```
4. The map falls back to a vendor list view if no token is provided

---

## Project Structure

```
sporkd/
├── backend/
│   ├── app/
│   │   ├── api/           auth, vendors, hours, reviews, favorites, admin
│   │   ├── models/        SQLAlchemy ORM models
│   │   ├── schemas/       Pydantic request/response schemas
│   │   ├── services/
│   │   │   └── hours_service.py   DST-safe timezone logic
│   │   ├── utils/         auth (JWT/bcrypt), geo (haversine)
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── seed.py            Demo data
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── app/           Next.js App Router pages
│       │   ├── page.tsx           Home / discovery feed
│       │   ├── map/               Map view
│       │   ├── vendor/[slug]/     Vendor detail
│       │   ├── favorites/         Saved vendors
│       │   ├── auth/              Login / register
│       │   ├── vendor/dashboard/  Vendor management
│       │   └── admin/             Admin panel
│       ├── components/    Navbar, VendorCard, VendorMap, SearchBar
│       ├── lib/api.ts     Typed API client
│       └── store/         Zustand auth store
├── docker-compose.yml
└── README.md
```
