import math
from typing import Optional, Tuple


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns distance in miles between two lat/lng points."""
    R = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def bounding_box(lat: float, lng: float, miles: float) -> Tuple[float, float, float, float]:
    """Return (min_lat, max_lat, min_lng, max_lng) for a rough bounding box."""
    lat_delta = miles / 69.0
    lng_delta = miles / (69.0 * math.cos(math.radians(lat)))
    return (lat - lat_delta, lat + lat_delta, lng - lng_delta, lng + lng_delta)


def generate_slug(name: str) -> str:
    import re
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug
