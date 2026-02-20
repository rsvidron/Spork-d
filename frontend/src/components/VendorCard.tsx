"use client";
import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, Heart, Clock } from "lucide-react";
import { VendorSummary } from "@/lib/api";
import clsx from "clsx";

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: "Food Truck",
  popup: "Pop-up",
  bar: "Bar",
  market_stall: "Market Stall",
  cart: "Cart",
  other: "Other",
};

const CATEGORY_EMOJI: Record<string, string> = {
  food_truck: "🚚",
  popup: "🎪",
  bar: "🍹",
  market_stall: "🏪",
  cart: "🛒",
  other: "🍽️",
};

interface VendorCardProps {
  vendor: VendorSummary;
  onFavoriteToggle?: (id: number) => void;
  isFavorited?: boolean;
  className?: string;
}

export function VendorCard({ vendor, onFavoriteToggle, isFavorited, className }: VendorCardProps) {
  return (
    <Link href={`/vendor/${vendor.slug}`} className={clsx("group card block hover:shadow-card-hover transition-all duration-200", className)}>
      {/* Cover Image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {vendor.cover_photo_url ? (
          <Image
            src={vendor.cover_photo_url}
            alt={vendor.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-50">
            <span className="text-5xl">{CATEGORY_EMOJI[vendor.category] || "🍽️"}</span>
          </div>
        )}
        {/* Favorite button */}
        {onFavoriteToggle && (
          <button
            onClick={(e) => { e.preventDefault(); onFavoriteToggle(vendor.id); }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Heart className={clsx("w-4 h-4 transition-colors", isFavorited ? "fill-red-500 text-red-500" : "text-gray-500")} />
          </button>
        )}
        {/* Open badge */}
        {vendor.is_open !== undefined && (
          <div className="absolute top-3 left-3">
            <span className={clsx("badge", vendor.is_open ? "badge-open" : "badge-closed")}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", vendor.is_open ? "bg-green-500" : "bg-red-400")} />
              {vendor.is_open ? "Open" : "Closed"}
            </span>
          </div>
        )}
        {/* Category pill */}
        <div className="absolute bottom-3 left-3">
          <span className="badge bg-black/60 text-white backdrop-blur-sm">
            {CATEGORY_EMOJI[vendor.category]} {CATEGORY_LABELS[vendor.category] || vendor.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-brand-500 transition-colors line-clamp-1">
            {vendor.name}
          </h3>
          {vendor.average_rating > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold text-gray-800">{vendor.average_rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({vendor.review_count})</span>
            </div>
          )}
        </div>

        {/* Location + distance */}
        <div className="flex items-center gap-1 mt-1.5 text-sm text-gray-500">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{[vendor.city, vendor.state].filter(Boolean).join(", ")}</span>
          {vendor.distance_miles !== undefined && vendor.distance_miles !== null && (
            <span className="shrink-0 ml-1">· {vendor.distance_miles < 0.1 ? "<0.1" : vendor.distance_miles.toFixed(1)} mi</span>
          )}
        </div>

        {/* Open status */}
        {vendor.open_status_label && (
          <div className="flex items-center gap-1 mt-1 text-xs">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className={clsx("font-medium", vendor.is_open ? "text-green-600" : "text-gray-500")}>
              {vendor.open_status_label}
            </span>
          </div>
        )}

        {/* Tags */}
        {vendor.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {vendor.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
            {vendor.tags.length > 3 && (
              <span className="tag-chip text-gray-400">+{vendor.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
