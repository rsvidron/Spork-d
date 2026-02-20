import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("lb_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("lb_token");
      localStorage.removeItem("lb_user");
    }
    return Promise.reject(err);
  }
);

// ── Types ──────────────────────────────────────────────────────────────────

export type UserRole = "user" | "vendor" | "admin";

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface VendorSummary {
  id: number;
  name: string;
  slug: string;
  category: string;
  status: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  average_rating: number;
  review_count: number;
  favorite_count: number;
  cover_photo_url?: string;
  tags: string[];
  distance_miles?: number;
  is_open?: boolean;
  open_status_label?: string;
}

export interface VendorDetail extends VendorSummary {
  description?: string;
  address?: string;
  zip_code?: string;
  timezone: string;
  phone?: string;
  website?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  trending_score: number;
  is_featured: boolean;
  cover_photo_url?: string;
  created_at: string;
  photos: Photo[];
  closes_at?: string;
  opens_at?: string;
  next_open_day?: string;
  weekly_schedule?: DaySchedule[];
  is_favorited?: boolean;
}

export interface Photo {
  id: number;
  url: string;
  caption?: string;
  is_cover: boolean;
  sort_order: number;
}

export interface DaySchedule {
  day: string;
  dow: number;
  is_closed: boolean;
  intervals: { start: string; end: string; start_12h: string; end_12h: string }[];
}

export interface Review {
  id: number;
  user_id: number;
  vendor_id: number;
  rating: number;
  body?: string;
  is_hidden: boolean;
  created_at: string;
  updated_at?: string;
  username?: string;
  avatar_url?: string;
  flag_count: number;
}

export interface WeeklyHour {
  id?: number;
  day_of_week: number;
  is_closed: boolean;
  start_time_local?: string;
  end_time_local?: string;
  interval_index: number;
}

export interface HoursException {
  id?: number;
  exception_date: string;
  is_closed: boolean;
  start_time_local?: string;
  end_time_local?: string;
  note?: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    api.post("/api/auth/register", data),
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  me: () => api.get<User>("/api/auth/me"),
};

// ── Vendors ────────────────────────────────────────────────────────────────

export const vendorApi = {
  search: (params: Record<string, unknown>) =>
    api.get<VendorSummary[]>("/api/vendors/search", { params }),
  featured: (params?: { lat?: number; lng?: number; limit?: number }) =>
    api.get<VendorSummary[]>("/api/vendors/featured", { params }),
  getBySlug: (slug: string, params?: { lat?: number; lng?: number }) =>
    api.get<VendorDetail>(`/api/vendors/${slug}`, { params }),
  create: (data: unknown) => api.post<VendorDetail>("/api/vendors", data),
  update: (id: number, data: unknown) => api.patch<VendorDetail>(`/api/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/api/vendors/${id}`),
};

// ── Hours ──────────────────────────────────────────────────────────────────

export const hoursApi = {
  getWeekly: (vendorId: number) =>
    api.get<WeeklyHour[]>(`/api/vendors/${vendorId}/hours/weekly`),
  replaceWeekly: (vendorId: number, hours: WeeklyHour[]) =>
    api.put<WeeklyHour[]>(`/api/vendors/${vendorId}/hours/weekly`, hours),
  getExceptions: (vendorId: number) =>
    api.get<HoursException[]>(`/api/vendors/${vendorId}/hours/exceptions`),
  addException: (vendorId: number, exc: HoursException) =>
    api.post(`/api/vendors/${vendorId}/hours/exceptions`, exc),
  deleteException: (vendorId: number, excId: number) =>
    api.delete(`/api/vendors/${vendorId}/hours/exceptions/${excId}`),
  getStatus: (vendorId: number) =>
    api.get(`/api/vendors/${vendorId}/hours/status`),
};

// ── Reviews ────────────────────────────────────────────────────────────────

export const reviewApi = {
  getReviews: (vendorId: number, params?: { limit?: number; offset?: number }) =>
    api.get<Review[]>(`/api/vendors/${vendorId}/reviews`, { params }),
  create: (vendorId: number, data: { rating: number; body?: string }) =>
    api.post<Review>(`/api/vendors/${vendorId}/reviews`, data),
  update: (vendorId: number, reviewId: number, data: { rating?: number; body?: string }) =>
    api.patch<Review>(`/api/vendors/${vendorId}/reviews/${reviewId}`, data),
  delete: (vendorId: number, reviewId: number) =>
    api.delete(`/api/vendors/${vendorId}/reviews/${reviewId}`),
  flag: (vendorId: number, reviewId: number, reason?: string) =>
    api.post(`/api/vendors/${vendorId}/reviews/${reviewId}/flag`, null, { params: { reason } }),
};

// ── Favorites ──────────────────────────────────────────────────────────────

export const favoriteApi = {
  getFavorites: () => api.get<VendorSummary[]>("/api/favorites"),
  add: (vendorId: number) => api.post(`/api/favorites/${vendorId}`),
  remove: (vendorId: number) => api.delete(`/api/favorites/${vendorId}`),
};

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => api.get("/api/admin/stats"),
  getUsers: (params?: { q?: string; limit?: number; offset?: number }) =>
    api.get<User[]>("/api/admin/users", { params }),
  disableUser: (id: number) => api.patch(`/api/admin/users/${id}/disable`),
  enableUser: (id: number) => api.patch(`/api/admin/users/${id}/enable`),
  setRole: (id: number, role: UserRole) => api.patch(`/api/admin/users/${id}/role`, null, { params: { role } }),
  getVendors: (params?: unknown) => api.get("/api/admin/vendors", { params }),
  approveVendor: (id: number) => api.patch(`/api/admin/vendors/${id}/approve`),
  suspendVendor: (id: number) => api.patch(`/api/admin/vendors/${id}/suspend`),
  featureVendor: (id: number, featured: boolean) =>
    api.patch(`/api/admin/vendors/${id}/feature`, null, { params: { featured } }),
  getFlaggedReviews: () => api.get("/api/admin/reviews/flagged"),
  hideReview: (id: number) => api.patch(`/api/admin/reviews/${id}/hide`),
  unhideReview: (id: number) => api.patch(`/api/admin/reviews/${id}/unhide`),
};
