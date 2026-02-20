"use client";
import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { VendorSummary } from "@/lib/api";
import Link from "next/link";
import { Star, Clock } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface VendorMapProps {
  vendors: VendorSummary[];
  center?: { lat: number; lng: number } | null;
  selectedVendor?: VendorSummary | null;
  onVendorSelect?: (v: VendorSummary | null) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  food_truck: "🚚", popup: "🎪", bar: "🍹", market_stall: "🏪", cart: "🛒", other: "🍽️",
};

export default function VendorMap({ vendors, center, selectedVendor, onVendorSelect }: VendorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) {
      // Render a fallback if no token
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: center ? [center.lng, center.lat] : [-98.5795, 39.8283],
      zoom: center ? 12 : 4,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update center
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.easeTo({ center: [center.lng, center.lat], zoom: 12 });
    }
  }, [center]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const newIds = new Set(vendors.filter((v) => v.latitude && v.longitude).map((v) => v.id));

    // Remove old
    existingIds.forEach((id) => {
      if (!newIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    });

    // Add new
    vendors.forEach((vendor) => {
      if (!vendor.latitude || !vendor.longitude) return;
      if (markersRef.current.has(vendor.id)) return;

      const el = document.createElement("div");
      el.className = "vendor-marker cursor-pointer select-none transition-transform hover:scale-110";
      el.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 rounded-full border-2 ${vendor.is_open ? "border-green-500 bg-white" : "border-gray-300 bg-gray-100"}
               flex items-center justify-center shadow-md text-xl">
            ${CATEGORY_EMOJI[vendor.category] || "🍽️"}
          </div>
          ${vendor.is_open ? '<div class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>' : ""}
        </div>
      `;

      el.addEventListener("click", () => {
        onVendorSelect?.(vendor);

        // Popup content
        popupRef.current?.remove();
        const popup = new mapboxgl.Popup({ offset: 25, maxWidth: "280px", closeButton: false })
          .setLngLat([vendor.longitude!, vendor.latitude!])
          .setHTML(`
            <div class="p-3 min-w-[240px]">
              ${vendor.cover_photo_url ? `<img src="${vendor.cover_photo_url}" class="w-full h-28 object-cover rounded-xl mb-3" alt="${vendor.name}" />` : ""}
              <h3 class="font-bold text-gray-900 text-sm">${vendor.name}</h3>
              <p class="text-xs text-gray-500 mt-0.5">${[vendor.city, vendor.state].filter(Boolean).join(", ")}</p>
              ${vendor.open_status_label ? `<p class="text-xs mt-1 font-medium ${vendor.is_open ? "text-green-600" : "text-gray-500"}">
                ${vendor.open_status_label}
              </p>` : ""}
              ${vendor.average_rating > 0 ? `<div class="flex items-center gap-1 mt-1.5">
                <span class="text-yellow-400 text-xs">★</span>
                <span class="text-xs font-semibold">${vendor.average_rating.toFixed(1)}</span>
                <span class="text-xs text-gray-400">(${vendor.review_count})</span>
              </div>` : ""}
              <a href="/vendor/${vendor.slug}" class="mt-2 block text-center text-xs font-semibold text-white bg-orange-500 rounded-lg py-1.5 hover:bg-orange-600 transition-colors">
                View details →
              </a>
            </div>
          `)
          .addTo(map);
        popupRef.current = popup;
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([vendor.longitude, vendor.latitude])
        .addTo(map);

      markersRef.current.set(vendor.id, marker);
    });
  }, [vendors, onVendorSelect]);

  // Fly to selected vendor
  useEffect(() => {
    if (selectedVendor?.latitude && selectedVendor?.longitude && mapRef.current) {
      mapRef.current.easeTo({ center: [selectedVendor.longitude, selectedVendor.latitude], zoom: 14 });
    }
  }, [selectedVendor]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">🗺️</div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Map not configured</h3>
          <p className="text-gray-500 text-sm">
            Set <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env.local</code> to enable the interactive map.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 w-full max-w-sm mt-4">
          {vendors.slice(0, 5).map((v) => (
            <Link key={v.id} href={`/vendor/${v.slug}`}
              className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-card transition-shadow border border-gray-100">
              <span className="text-2xl">{CATEGORY_EMOJI[v.category]}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{v.name}</p>
                <p className="text-xs text-gray-500">{[v.city, v.state].filter(Boolean).join(", ")}</p>
              </div>
              {v.is_open !== undefined && (
                <span className={`ml-auto text-xs font-medium shrink-0 ${v.is_open ? "text-green-600" : "text-gray-400"}`}>
                  {v.is_open ? "Open" : "Closed"}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="w-full h-full" />;
}
