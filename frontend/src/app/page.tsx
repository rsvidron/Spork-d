"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "react-query";
import { vendorApi, favoriteApi, VendorSummary } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { VendorCard } from "@/components/VendorCard";
import { SearchBar, SearchFilters } from "@/components/SearchBar";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import Link from "next/link";
import { Map, TrendingUp, Star, Sparkles, ChevronRight } from "lucide-react";
import clsx from "clsx";

export default function HomePage() {
  const { user } = useAuthStore();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);

  // Geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error("Couldn't get location. Try searching by city or zip."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  // Featured vendors
  const { data: featured, isLoading: featuredLoading } = useQuery(
    ["featured", location],
    () => vendorApi.featured({ lat: location?.lat, lng: location?.lng, limit: 8 }).then((r) => r.data),
    { keepPreviousData: true }
  );

  // Search results
  const hasActiveSearch = Object.values(filters).some((v) => v !== undefined && v !== "");
  const { data: searchResults, isLoading: searchLoading } = useQuery(
    ["search", filters, location],
    () =>
      vendorApi.search({
        ...filters,
        lat: location?.lat,
        lng: location?.lng,
      }).then((r) => r.data),
    { enabled: hasActiveSearch, keepPreviousData: true }
  );

  // Load user favorites
  useEffect(() => {
    if (!user) return;
    favoriteApi.getFavorites().then((r) => {
      setFavorites(new Set(r.data.map((v: VendorSummary) => v.id)));
    }).catch(() => {});
  }, [user]);

  const handleFavoriteToggle = async (vendorId: number) => {
    if (!user) { toast.error("Sign in to save favorites"); return; }
    const wasFav = favorites.has(vendorId);
    setFavorites((prev) => {
      const next = new Set(prev);
      wasFav ? next.delete(vendorId) : next.add(vendorId);
      return next;
    });
    try {
      if (wasFav) {
        await favoriteApi.remove(vendorId);
        toast("Removed from favorites");
      } else {
        await favoriteApi.add(vendorId);
        toast.success("Saved to favorites ❤️");
      }
    } catch {
      // Revert
      setFavorites((prev) => {
        const next = new Set(prev);
        wasFav ? next.add(vendorId) : next.delete(vendorId);
        return next;
      });
    }
  };

  const displayVendors = hasActiveSearch ? searchResults : featured;
  const isLoading = hasActiveSearch ? searchLoading : featuredLoading;

  return (
    <div className="min-h-screen bg-surface-muted">
      <Navbar />

      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
              Discover <span className="text-brand-500">Spork'd</span> near you
            </h1>
            <p className="text-gray-500 text-base md:text-lg">
              Food trucks, pop-ups, bars, and vendors — find what's open right now.
            </p>
          </div>
          <SearchBar
            filters={filters}
            onFiltersChange={setFilters}
            onLocationRequest={requestLocation}
            hasLocation={!!location}
          />
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Map CTA */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {hasActiveSearch ? (
                <><TrendingUp className="w-5 h-5 text-brand-500" /> Search Results</>
              ) : (
                <><Sparkles className="w-5 h-5 text-brand-500" /> Featured Near You</>
              )}
            </span>
            {displayVendors && (
              <span className="text-sm text-gray-400">({displayVendors.length} vendors)</span>
            )}
          </div>
          <Link href="/map" className="btn-secondary text-sm flex items-center gap-1.5">
            <Map className="w-4 h-4" /> Map view
          </Link>
        </div>

        {/* Vendor grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-200 rounded-full w-16" />
                    <div className="h-5 bg-gray-200 rounded-full w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayVendors?.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No vendors found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filters.</p>
            <button onClick={() => setFilters({})} className="btn-primary">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayVendors?.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onFavoriteToggle={handleFavoriteToggle}
                isFavorited={favorites.has(vendor.id)}
              />
            ))}
          </div>
        )}

        {/* Category browse section */}
        {!hasActiveSearch && (
          <section className="mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Browse by category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { cat: "food_truck", label: "Food Trucks", emoji: "🚚", color: "from-orange-100 to-red-50" },
                { cat: "popup", label: "Pop-ups", emoji: "🎪", color: "from-purple-100 to-pink-50" },
                { cat: "bar", label: "Bars", emoji: "🍹", color: "from-blue-100 to-cyan-50" },
                { cat: "market_stall", label: "Markets", emoji: "🏪", color: "from-green-100 to-emerald-50" },
                { cat: "cart", label: "Carts", emoji: "🛒", color: "from-yellow-100 to-amber-50" },
                { cat: "", label: "All Vendors", emoji: "🗺️", color: "from-gray-100 to-gray-50" },
              ].map(({ cat, label, emoji, color }) => (
                <button
                  key={cat}
                  onClick={() => setFilters({ category: cat || undefined })}
                  className={clsx(
                    "bg-gradient-to-br rounded-2xl p-4 text-center hover:shadow-card transition-all cursor-pointer border border-transparent hover:border-gray-200",
                    color
                  )}
                >
                  <div className="text-3xl mb-2">{emoji}</div>
                  <div className="text-xs font-semibold text-gray-700">{label}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="font-semibold text-gray-900">Spork'd</div>
          <div className="flex gap-6">
            <Link href="/map" className="hover:text-brand-500 transition-colors">Map</Link>
            <Link href="/auth/register" className="hover:text-brand-500 transition-colors">Join free</Link>
            <Link href="/vendor/dashboard" className="hover:text-brand-500 transition-colors">For Vendors</Link>
          </div>
          <p>© {new Date().getFullYear()} Spork'd. Discover local, eat local.</p>
        </div>
      </footer>
    </div>
  );
}
