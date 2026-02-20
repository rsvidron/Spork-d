"use client";
import { useState, useCallback } from "react";
import { Search, SlidersHorizontal, X, Clock, Calendar, MapPin } from "lucide-react";
import clsx from "clsx";

export interface SearchFilters {
  q?: string;
  category?: string;
  tags?: string;
  open_now?: boolean;
  open_day?: number;
  open_time?: string;
  distance_miles?: number;
  sort_by?: string;
}

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (f: SearchFilters) => void;
  onLocationRequest?: () => void;
  hasLocation?: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CATEGORIES = [
  { value: "", label: "All Types" },
  { value: "food_truck", label: "🚚 Food Truck" },
  { value: "popup", label: "🎪 Pop-up" },
  { value: "bar", label: "🍹 Bar" },
  { value: "market_stall", label: "🏪 Market Stall" },
  { value: "cart", label: "🛒 Cart" },
];
const DISTANCES = [1, 5, 10, 25];
const SORT_OPTIONS = [
  { value: "trending", label: "Trending" },
  { value: "rating", label: "Top Rated" },
  { value: "distance", label: "Nearest" },
  { value: "newest", label: "Newest" },
];

export function SearchBar({ filters, onFiltersChange, onLocationRequest, hasLocation }: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState(filters.q || "");

  const update = (patch: Partial<SearchFilters>) => onFiltersChange({ ...filters, ...patch });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: query });
  };

  const clearAll = () => {
    setQuery("");
    onFiltersChange({});
  };

  const activeFilterCount = [
    filters.category, filters.open_now, filters.open_day !== undefined, filters.open_time, filters.distance_miles
  ].filter(Boolean).length;

  return (
    <div className="w-full space-y-3">
      {/* Search input row */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors, cuisine, tags…"
            className="input pl-12 pr-10 h-12 text-base"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); update({ q: "" }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary h-12 px-5">Search</button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={clsx("relative btn-secondary h-12 px-4",
            showFilters && "bg-orange-50 border-brand-300 text-brand-600"
          )}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </form>

      {/* Quick filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { onLocationRequest?.(); }}
          className={clsx("badge cursor-pointer transition-colors",
            hasLocation ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <MapPin className="w-3 h-3" />
          {hasLocation ? "Near you" : "Use my location"}
        </button>
        <button
          onClick={() => update({ open_now: !filters.open_now, open_day: undefined, open_time: undefined })}
          className={clsx("badge cursor-pointer transition-colors",
            filters.open_now ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Clock className="w-3 h-3" /> Open now
        </button>
        {DISTANCES.map((d) => (
          <button
            key={d}
            onClick={() => update({ distance_miles: filters.distance_miles === d ? undefined : d })}
            className={clsx("badge cursor-pointer transition-colors",
              filters.distance_miles === d ? "bg-orange-100 text-brand-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {d} mi
          </button>
        ))}
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="badge bg-red-50 text-red-500 cursor-pointer hover:bg-red-100 transition-colors">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Category</label>
              <select
                value={filters.category || ""}
                onChange={(e) => update({ category: e.target.value || undefined })}
                className="input py-2 text-sm"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sort by</label>
              <select
                value={filters.sort_by || "trending"}
                onChange={(e) => update({ sort_by: e.target.value })}
                className="input py-2 text-sm"
              >
                {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* Open on day */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Open on
              </label>
              <select
                value={filters.open_day !== undefined ? String(filters.open_day) : ""}
                onChange={(e) => {
                  update({
                    open_day: e.target.value !== "" ? Number(e.target.value) : undefined,
                    open_now: undefined,
                  });
                }}
                className="input py-2 text-sm"
              >
                <option value="">Any day</option>
                {DAYS.map((day, i) => <option key={i} value={i}>{day}</option>)}
              </select>
            </div>

            {/* Open at time */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Open at
              </label>
              <input
                type="time"
                value={filters.open_time || ""}
                onChange={(e) => update({ open_time: e.target.value || undefined, open_now: undefined })}
                className="input py-2 text-sm"
              />
            </div>
          </div>

          {/* Tags input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tags (comma-separated)</label>
            <input
              type="text"
              value={filters.tags || ""}
              onChange={(e) => update({ tags: e.target.value || undefined })}
              placeholder="e.g. bbq, vegan, tacos"
              className="input py-2 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
