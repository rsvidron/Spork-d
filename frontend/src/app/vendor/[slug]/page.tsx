"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "react-query";
import Image from "next/image";
import Link from "next/link";
import {
  vendorApi, reviewApi, favoriteApi, VendorDetail, Review
} from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import {
  Star, Heart, MapPin, Phone, Globe, Instagram, Twitter,
  Clock, ChevronLeft, Flag, Pencil, Trash2, ExternalLink,
  Facebook, CheckCircle2
} from "lucide-react";
import clsx from "clsx";

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: "Food Truck", popup: "Pop-up", bar: "Bar",
  market_stall: "Market Stall", cart: "Cart", other: "Other",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function StarRating({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          className={clsx("transition-colors", onChange ? "cursor-pointer" : "cursor-default")}
        >
          <Star className={clsx("w-6 h-6 transition-colors",
            (hover || value) >= n ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          )} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, vendorId, currentUserId, onDelete }: {
  review: Review; vendorId: number; currentUserId?: number; onDelete: (id: number) => void
}) {
  const [flagging, setFlagging] = useState(false);

  const handleFlag = async () => {
    setFlagging(true);
    try {
      await reviewApi.flag(vendorId, review.id, "Inappropriate content");
      toast.success("Review flagged for review");
    } catch { toast.error("Couldn't flag review"); }
    finally { setFlagging(false); }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {review.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{review.username}</p>
            <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating value={review.rating} />
          {currentUserId === review.user_id ? (
            <button onClick={() => onDelete(review.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFlag} disabled={flagging} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <Flag className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {review.body && <p className="mt-3 text-sm text-gray-600 leading-relaxed">{review.body}</p>}
    </div>
  );
}

export default function VendorPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [isFav, setIsFav] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showUserTz, setShowUserTz] = useState(false);

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data: vendor, isLoading } = useQuery<VendorDetail>(
    ["vendor", slug],
    () => vendorApi.getBySlug(slug as string).then((r) => r.data),
    { enabled: !!slug }
  );

  const { data: reviews = [] } = useQuery<Review[]>(
    ["reviews", vendor?.id],
    () => reviewApi.getReviews(vendor!.id).then((r) => r.data),
    { enabled: !!vendor }
  );

  // Favorite status
  useEffect(() => {
    if (!user || !vendor) return;
    favoriteApi.getFavorites().then((r) => {
      setIsFav(r.data.some((v: { id: number }) => v.id === vendor.id));
    }).catch(() => {});
  }, [user, vendor]);

  const toggleFavorite = async () => {
    if (!user) { toast.error("Sign in to save favorites"); return; }
    const prev = isFav;
    setIsFav(!prev);
    try {
      if (prev) { await favoriteApi.remove(vendor!.id); toast("Removed from favorites"); }
      else { await favoriteApi.add(vendor!.id); toast.success("Saved ❤️"); }
    } catch { setIsFav(prev); }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRating) { toast.error("Please select a rating"); return; }
    setSubmittingReview(true);
    try {
      await reviewApi.create(vendor!.id, { rating: reviewRating, body: reviewBody });
      toast.success("Review posted!");
      qc.invalidateQueries(["reviews", vendor!.id]);
      qc.invalidateQueries(["vendor", slug]);
      setReviewRating(0); setReviewBody("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Couldn't post review");
    } finally { setSubmittingReview(false); }
  };

  const deleteReview = async (reviewId: number) => {
    try {
      await reviewApi.delete(vendor!.id, reviewId);
      qc.invalidateQueries(["reviews", vendor!.id]);
      qc.invalidateQueries(["vendor", slug]);
      toast.success("Review deleted");
    } catch { toast.error("Couldn't delete review"); }
  };

  if (isLoading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-64 bg-gray-200 rounded-3xl" />
        <div className="h-8 bg-gray-200 rounded-full w-1/2" />
        <div className="h-4 bg-gray-200 rounded-full w-1/3" />
      </div>
    </div>
  );

  if (!vendor) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor not found</h2>
        <Link href="/" className="btn-primary mt-4">Back to discover</Link>
      </div>
    </div>
  );

  const photos = vendor.photos || [];
  const allPhotos = vendor.cover_photo_url && !photos.find((p) => p.is_cover)
    ? [{ id: 0, url: vendor.cover_photo_url, caption: null, is_cover: true, sort_order: -1 }, ...photos]
    : photos;

  // Convert time to user's timezone for display
  const convertTime = (hhmm: string, vendorTz: string) => {
    if (!showUserTz) return hhmm + " (" + vendorTz.split("/")[1]?.replace("_", " ") + ")";
    try {
      const [h, m] = hhmm.split(":").map(Number);
      const date = new Date();
      date.setHours(h, m, 0, 0);
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric", minute: "2-digit", timeZone: userTz,
      }).format(date);
    } catch { return hhmm; }
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* Photo gallery */}
        {allPhotos.length > 0 && (
          <div className="relative rounded-3xl overflow-hidden bg-gray-100 mb-6 aspect-[16/7]">
            <Image
              src={allPhotos[activePhotoIdx]?.url}
              alt={vendor.name}
              fill
              className="object-cover"
              priority
            />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allPhotos.map((_, i) => (
                  <button key={i} onClick={() => setActivePhotoIdx(i)}
                    className={clsx("w-2 h-2 rounded-full transition-colors",
                      i === activePhotoIdx ? "bg-white" : "bg-white/50"
                    )} />
                ))}
              </div>
            )}
            {/* Thumbnail strip */}
            {allPhotos.length > 1 && (
              <div className="absolute bottom-0 right-4 bottom-4 flex gap-2">
                {allPhotos.slice(0, 4).map((p, i) => (
                  <button key={p.id} onClick={() => setActivePhotoIdx(i)}
                    className={clsx("w-12 h-12 rounded-xl overflow-hidden border-2 transition-all",
                      i === activePhotoIdx ? "border-white" : "border-transparent opacity-70 hover:opacity-100"
                    )}>
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-orange-100 text-brand-600">{CATEGORY_LABELS[vendor.category]}</span>
                    <span className={clsx("badge", vendor.is_open ? "badge-open" : "badge-closed")}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full", vendor.is_open ? "bg-green-500" : "bg-red-400")} />
                      {vendor.is_open ? "Open" : "Closed"}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">{vendor.name}</h1>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{[vendor.address, vendor.city, vendor.state, vendor.zip_code].filter(Boolean).join(", ")}</span>
                  </div>
                </div>
                <button onClick={toggleFavorite}
                  className="shrink-0 w-11 h-11 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-red-300 transition-colors">
                  <Heart className={clsx("w-5 h-5 transition-colors", isFav ? "fill-red-500 text-red-500" : "text-gray-400")} />
                </button>
              </div>

              {/* Rating */}
              {vendor.review_count > 0 && (
                <div className="flex items-center gap-3 mt-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold text-gray-900">{vendor.average_rating.toFixed(1)}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{vendor.review_count} review{vendor.review_count !== 1 ? "s" : ""}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-500 text-sm">{vendor.favorite_count} saved</span>
                </div>
              )}

              {/* Open status banner */}
              {vendor.open_status_label && (
                <div className={clsx("mt-4 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium",
                  vendor.is_open ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                )}>
                  <Clock className="w-4 h-4" />
                  {vendor.open_status_label}
                </div>
              )}

              {/* Description */}
              {vendor.description && (
                <p className="mt-4 text-gray-600 leading-relaxed">{vendor.description}</p>
              )}

              {/* Tags */}
              {vendor.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {vendor.tags.map((tag) => (
                    <span key={tag} className="tag-chip">{tag}</span>
                  ))}
                </div>
              )}

              {/* Contact / Social */}
              <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-100">
                {vendor.phone && (
                  <a href={`tel:${vendor.phone}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-500 transition-colors">
                    <Phone className="w-4 h-4" /> {vendor.phone}
                  </a>
                )}
                {vendor.website && (
                  <a href={vendor.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-500 transition-colors">
                    <Globe className="w-4 h-4" /> Website
                  </a>
                )}
                {vendor.instagram && (
                  <a href={`https://instagram.com/${vendor.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-500 transition-colors">
                    <Instagram className="w-4 h-4" /> {vendor.instagram}
                  </a>
                )}
                {vendor.twitter && (
                  <a href={`https://twitter.com/${vendor.twitter.replace("@", "")}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-500 transition-colors">
                    <Twitter className="w-4 h-4" /> {vendor.twitter}
                  </a>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" /> Reviews
                {reviews.length > 0 && <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>}
              </h2>

              {/* Write review */}
              {user ? (
                <form onSubmit={submitReview} className="mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Share your experience</p>
                  <StarRating value={reviewRating} onChange={setReviewRating} />
                  <textarea
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    placeholder="Tell others what you thought…"
                    rows={3}
                    className="input mt-3 resize-none"
                  />
                  <button type="submit" disabled={submittingReview || !reviewRating} className="btn-primary mt-3 w-full">
                    {submittingReview ? "Posting…" : "Post Review"}
                  </button>
                </form>
              ) : (
                <div className="mb-5 p-4 bg-gray-50 rounded-2xl text-center">
                  <p className="text-sm text-gray-500 mb-3">Sign in to leave a review</p>
                  <Link href="/auth/login" className="btn-primary text-sm">Sign in</Link>
                </div>
              )}

              {/* Review list */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No reviews yet. Be the first!</p>
                ) : (
                  reviews.filter((r) => !r.is_hidden).map((r) => (
                    <ReviewCard key={r.id} review={r} vendorId={vendor.id}
                      currentUserId={user?.id} onDelete={deleteReview} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Hours */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-500" /> Hours
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Local</span>
                  <button
                    onClick={() => setShowUserTz(!showUserTz)}
                    className={clsx("relative w-10 h-5 rounded-full transition-colors",
                      showUserTz ? "bg-brand-500" : "bg-gray-200"
                    )}
                  >
                    <span className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                      showUserTz ? "left-5" : "left-0.5"
                    )} />
                  </button>
                  <span className="text-xs text-gray-400">My TZ</span>
                </div>
              </div>

              <div className="text-xs text-gray-400 mb-3">
                Timezone: <span className="font-medium text-gray-600">{vendor.timezone}</span>
              </div>

              {vendor.weekly_schedule ? (
                <div className="space-y-1.5">
                  {vendor.weekly_schedule.map((day) => {
                    const isToday = new Date().getDay() === (day.dow + 1) % 7;
                    return (
                      <div key={day.dow} className={clsx(
                        "flex items-start justify-between py-1.5 px-2 rounded-lg text-sm",
                        isToday ? "bg-orange-50 font-semibold" : ""
                      )}>
                        <span className={clsx("w-24 shrink-0", isToday ? "text-brand-600" : "text-gray-700")}>
                          {day.day.slice(0, 3)}
                        </span>
                        {day.is_closed ? (
                          <span className="text-gray-400 text-xs">Closed</span>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            {day.intervals.map((iv, i) => (
                              <span key={i} className="text-gray-600 text-xs">
                                {iv.start_12h} – {iv.end_12h}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">Hours not set</p>
              )}
            </div>

            {/* Map preview */}
            {vendor.latitude && vendor.longitude && (
              <div className="card overflow-hidden">
                <div className="h-40 bg-gray-100 flex items-center justify-center">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${vendor.latitude},${vendor.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-2 text-gray-500 hover:text-brand-500 transition-colors"
                  >
                    <MapPin className="w-8 h-8" />
                    <span className="text-sm font-medium">Open in Maps</span>
                  </a>
                </div>
                <div className="p-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600 text-center">
                    {[vendor.address, vendor.city, vendor.state].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* Timezone info */}
            <div className="card p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">About this vendor</h4>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Category</dt>
                  <dd className="font-medium text-gray-900">{CATEGORY_LABELS[vendor.category]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Timezone</dt>
                  <dd className="font-medium text-gray-900">{vendor.timezone}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Member since</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(vendor.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
