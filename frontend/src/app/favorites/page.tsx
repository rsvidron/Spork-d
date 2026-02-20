"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "react-query";
import { favoriteApi, VendorSummary } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { VendorCard } from "@/components/VendorCard";
import { useAuthStore } from "@/store/authStore";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function FavoritesPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => { if (!user) router.push("/auth/login"); }, [user, router]);

  const { data: favorites, isLoading } = useQuery(
    ["favorites"],
    () => favoriteApi.getFavorites().then((r) => r.data),
    { enabled: !!user }
  );

  return (
    <div className="min-h-screen bg-surface-muted">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
          {favorites && <span className="text-gray-400">({favorites.length})</span>}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites?.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🤍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-500 mb-6">Explore vendors and tap the heart to save your favorites.</p>
            <Link href="/" className="btn-primary">Discover vendors</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {favorites?.map((v: VendorSummary) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
