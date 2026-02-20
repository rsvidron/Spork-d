"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { vendorApi, VendorSummary } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { VendorCard } from "@/components/VendorCard";
import { SearchBar, SearchFilters } from "@/components/SearchBar";
import { Map as MapIcon, List, X } from "lucide-react";
import clsx from "clsx";

// Dynamically import map to avoid SSR issues
const VendorMap = dynamic(() => import("@/components/VendorMap"), { ssr: false, loading: () => (
  <div className="flex-1 bg-gray-100 flex items-center justify-center">
    <div className="text-gray-400">Loading map…</div>
  </div>
) });

type ViewMode = "map" | "list" | "split";

export default function MapPage() {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorSummary | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [loading, setLoading] = useState(false);

  const fetchVendors = useCallback(async (f: SearchFilters, loc: typeof location) => {
    setLoading(true);
    try {
      const res = await vendorApi.search({
        ...f, lat: loc?.lat, lng: loc?.lng, limit: 100,
      });
      setVendors(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);
  useEffect(() => { fetchVendors(filters, location); }, [filters, location, fetchVendors]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-screen-2xl mx-auto">
          <SearchBar filters={filters} onFiltersChange={setFilters} onLocationRequest={requestLocation} hasLocation={!!location} />
        </div>
      </div>

      {/* View toggle (mobile) */}
      <div className="flex md:hidden bg-white border-b border-gray-100 px-4 py-2 gap-2">
        {(["map", "list"] as ViewMode[]).map((v) => (
          <button key={v} onClick={() => setViewMode(v)}
            className={clsx("flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5",
              viewMode === v ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"
            )}>
            {v === "map" ? <><MapIcon className="w-4 h-4" /> Map</> : <><List className="w-4 h-4" /> List</>}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vendor list sidebar */}
        <div className={clsx(
          "overflow-y-auto bg-surface-muted border-r border-gray-200 flex flex-col",
          viewMode === "list" ? "flex-1" : viewMode === "map" ? "hidden" : "hidden md:flex w-[380px] shrink-0"
        )}>
          <div className="p-4 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">{vendors.length} vendors</p>
              {loading && <span className="text-xs text-gray-400 animate-pulse">Updating…</span>}
            </div>
            {vendors.map((v) => (
              <div
                key={v.id}
                className={clsx("cursor-pointer rounded-2xl overflow-hidden transition-all",
                  selectedVendor?.id === v.id ? "ring-2 ring-brand-500" : ""
                )}
                onClick={() => setSelectedVendor(v)}
              >
                <VendorCard vendor={v} className="shadow-none rounded-2xl" />
              </div>
            ))}
            {vendors.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">🗺️</div>
                <p className="text-sm">No vendors found in this area</p>
              </div>
            )}
          </div>
        </div>

        {/* Map panel */}
        <div className={clsx(
          "flex-1 relative",
          viewMode === "list" ? "hidden" : "flex"
        )}>
          <VendorMap
            vendors={vendors}
            center={location}
            selectedVendor={selectedVendor}
            onVendorSelect={setSelectedVendor}
          />

          {/* Selected vendor popup (mobile overlay) */}
          {selectedVendor && viewMode === "map" && (
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <div className="relative">
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
                <VendorCard vendor={selectedVendor} className="shadow-card-hover" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
