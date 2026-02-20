import { create } from "zustand";
import { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  _hydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
  isAdmin: () => boolean;
  isVendor: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Always start null on server — hydrate on client in useEffect
  user: null,
  token: null,
  _hydrated: false,

  hydrate: () => {
    if (get()._hydrated) return;
    const token = localStorage.getItem("lb_token");
    const user = JSON.parse(localStorage.getItem("lb_user") || "null");
    set({ user, token, _hydrated: true });
  },

  setAuth: (user, token) => {
    localStorage.setItem("lb_token", token);
    localStorage.setItem("lb_user", JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem("lb_token");
    localStorage.removeItem("lb_user");
    set({ user: null, token: null });
  },

  isAdmin: () => get().user?.role === "admin",
  isVendor: () => ["vendor", "admin"].includes(get().user?.role || ""),
}));
