"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, MapPin, Heart, User, Settings, LogOut, ChevronDown } from "lucide-react";
import clsx from "clsx";

export function Navbar() {
  const { user, logout, isAdmin, isVendor } = useAuthStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
    setDropdownOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">Spork'd</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/map" className="hover:text-brand-500 transition-colors flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> Map
          </Link>
          {mounted && user && (
            <Link href="/favorites" className="hover:text-brand-500 transition-colors flex items-center gap-1.5">
              <Heart className="w-4 h-4" /> Favorites
            </Link>
          )}
          {mounted && isVendor() && (
            <Link href="/vendor/dashboard" className="hover:text-brand-500 transition-colors flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> Dashboard
            </Link>
          )}
          {mounted && isAdmin() && (
            <Link href="/admin" className="hover:text-brand-500 transition-colors text-brand-500 font-semibold">
              Admin
            </Link>
          )}
        </div>

        {/* Auth area */}
        <div className="flex items-center gap-3">
          {mounted && user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                  {user.full_name?.[0] || user.username[0].toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {user.full_name || user.username}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-card-hover border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-brand-100 text-brand-600 text-xs rounded-full font-medium capitalize">{user.role}</span>
                  </div>
                  {isVendor() && (
                    <Link href="/vendor/dashboard" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Settings className="w-4 h-4" /> Vendor Dashboard
                    </Link>
                  )}
                  {isAdmin() && (
                    <Link href="/admin" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-brand-500 hover:bg-orange-50 transition-colors font-medium">
                      <Settings className="w-4 h-4" /> Admin Panel
                    </Link>
                  )}
                  <Link href="/favorites" onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Heart className="w-4 h-4" /> My Favorites
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="btn-ghost text-sm hidden sm:flex">Sign in</Link>
              <Link href="/auth/register" className="btn-primary text-sm">Join free</Link>
            </div>
          )}
          {/* Mobile menu */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 flex flex-col gap-1">
            <Link href="/map" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              <MapPin className="w-4 h-4 text-brand-500" /> Map View
            </Link>
            {mounted && user && (
              <Link href="/favorites" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Heart className="w-4 h-4 text-brand-500" /> My Favorites
              </Link>
            )}
            {mounted && isVendor() && (
              <Link href="/vendor/dashboard" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Settings className="w-4 h-4 text-brand-500" /> Vendor Dashboard
              </Link>
            )}
            {mounted && isAdmin() && (
              <Link href="/admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-brand-500 hover:bg-orange-50">
                <Settings className="w-4 h-4" /> Admin Panel
              </Link>
            )}
            {mounted && !user && (
              <div className="flex gap-2 pt-2">
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="btn-secondary flex-1 text-sm">Sign in</Link>
                <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1 text-sm">Join free</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
