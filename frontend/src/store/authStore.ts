import { create } from "zustand";
import { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isVendor: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("lb_user") || "null") : null,
  token: typeof window !== "undefined" ? localStorage.getItem("lb_token") : null,

  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lb_token", token);
      localStorage.setItem("lb_user", JSON.stringify(user));
    }
    set({ user, token });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lb_token");
      localStorage.removeItem("lb_user");
    }
    set({ user: null, token: null });
  },

  isAdmin: () => get().user?.role === "admin",
  isVendor: () => ["vendor", "admin"].includes(get().user?.role || ""),
}));
