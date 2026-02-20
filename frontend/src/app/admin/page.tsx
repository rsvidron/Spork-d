"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { adminApi, User } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import {
  Users, Store, Star, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, Search, Eye, EyeOff, Shield, ShieldOff, Sparkles
} from "lucide-react";
import clsx from "clsx";

type Tab = "overview" | "vendors" | "users" | "reviews";

export default function AdminPage() {
  const { user, isAdmin } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorStatus, setVendorStatus] = useState("");

  useEffect(() => {
    if (!user) router.push("/auth/login");
    if (user && !isAdmin()) router.push("/");
  }, [user, isAdmin, router]);

  const { data: stats } = useQuery("admin-stats", () => adminApi.getStats().then((r) => r.data));
  const { data: users } = useQuery(
    ["admin-users", userSearch],
    () => adminApi.getUsers({ q: userSearch, limit: 50 }).then((r) => r.data),
    { enabled: tab === "users" }
  );
  const { data: vendors } = useQuery(
    ["admin-vendors", vendorSearch, vendorStatus],
    () => adminApi.getVendors({ q: vendorSearch, status: vendorStatus || undefined, limit: 50 }).then((r) => r.data),
    { enabled: tab === "vendors" }
  );
  const { data: flaggedReviews } = useQuery(
    "admin-flagged",
    () => adminApi.getFlaggedReviews().then((r) => r.data),
    { enabled: tab === "reviews" }
  );

  const statCards = [
    { icon: Users, label: "Users", value: stats?.total_users || 0, color: "text-blue-600 bg-blue-100" },
    { icon: Store, label: "Total Vendors", value: stats?.total_vendors || 0, color: "text-purple-600 bg-purple-100" },
    { icon: CheckCircle, label: "Active", value: stats?.active_vendors || 0, color: "text-green-600 bg-green-100" },
    { icon: AlertTriangle, label: "Pending", value: stats?.pending_vendors || 0, color: "text-yellow-600 bg-yellow-100" },
    { icon: Star, label: "Reviews", value: stats?.total_reviews || 0, color: "text-orange-600 bg-orange-100" },
    { icon: AlertTriangle, label: "Flagged", value: stats?.flagged_reviews || 0, color: "text-red-600 bg-red-100" },
  ];

  return (
    <div className="min-h-screen bg-surface-muted">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 mb-6 overflow-x-auto">
          {(["overview", "vendors", "users", "reviews"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize whitespace-nowrap",
                tab === t ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100"
              )}>
              {t === "reviews" ? "Flagged Reviews" : t}
              {t === "vendors" && stats?.pending_vendors > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded-full">{stats.pending_vendors}</span>
              )}
              {t === "reviews" && stats?.flagged_reviews > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{stats.flagged_reviews}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {statCards.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="card p-4 text-center">
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2", color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setTab("vendors")} className="btn-secondary text-sm">Manage Vendors</button>
                <button onClick={() => setTab("users")} className="btn-secondary text-sm">Manage Users</button>
                <button onClick={() => setTab("reviews")} className="btn-secondary text-sm">Review Flags</button>
              </div>
            </div>
          </div>
        )}

        {/* Vendors */}
        {tab === "vendors" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)}
                  placeholder="Search vendors…" className="input pl-10 py-2.5 text-sm" />
              </div>
              <select value={vendorStatus} onChange={(e) => setVendorStatus(e.target.value)} className="input py-2.5 text-sm w-36">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="space-y-2">
              {vendors?.items?.map((v: any) => (
                <div key={v.id} className="card p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{v.name}</span>
                      <span className={clsx("badge text-xs",
                        v.status === "active" ? "bg-green-100 text-green-700" :
                          v.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-600"
                      )}>{v.status}</span>
                    </div>
                    <p className="text-sm text-gray-500">{v.city}, {v.state} · ★{v.average_rating?.toFixed(1)} ({v.review_count})</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {v.status === "pending" && (
                      <button onClick={async () => {
                        await adminApi.approveVendor(v.id);
                        qc.invalidateQueries("admin-vendors");
                        qc.invalidateQueries("admin-stats");
                        toast.success("Vendor approved!");
                      }} className="btn-primary text-xs py-1.5 px-3">Approve</button>
                    )}
                    {v.status === "active" && (
                      <>
                        <button onClick={async () => {
                          await adminApi.featureVendor(v.id, true);
                          qc.invalidateQueries("admin-vendors");
                          toast.success("Marked as featured");
                        }} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Feature
                        </button>
                        <button onClick={async () => {
                          await adminApi.suspendVendor(v.id);
                          qc.invalidateQueries("admin-vendors");
                          qc.invalidateQueries("admin-stats");
                          toast.success("Vendor suspended");
                        }} className="btn-secondary text-xs py-1.5 px-3 text-red-600 border-red-200 hover:bg-red-50">Suspend</button>
                      </>
                    )}
                    {v.status === "suspended" && (
                      <button onClick={async () => {
                        await adminApi.approveVendor(v.id);
                        qc.invalidateQueries("admin-vendors");
                        toast.success("Vendor reinstated");
                      }} className="btn-secondary text-xs py-1.5 px-3 text-green-600">Reinstate</button>
                    )}
                  </div>
                </div>
              ))}
              {(!vendors?.items || vendors.items.length === 0) && (
                <div className="text-center py-12 text-gray-400">No vendors found</div>
              )}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email…" className="input pl-10 py-2.5 text-sm" />
            </div>
            <div className="space-y-2">
              {users?.map((u: User) => (
                <div key={u.id} className="card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{u.full_name || u.username}</span>
                        <span className={clsx("badge text-xs capitalize",
                          u.role === "admin" ? "bg-red-100 text-red-700" :
                            u.role === "vendor" ? "bg-purple-100 text-purple-700" :
                              "bg-gray-100 text-gray-600"
                        )}>{u.role}</span>
                        {!u.is_active && <span className="badge bg-gray-200 text-gray-600 text-xs">Disabled</span>}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {u.is_active ? (
                      <button onClick={async () => {
                        await adminApi.disableUser(u.id);
                        qc.invalidateQueries(["admin-users"]);
                        toast.success("User disabled");
                      }} className="btn-secondary text-xs py-1.5 px-3 text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1">
                        <ShieldOff className="w-3 h-3" /> Disable
                      </button>
                    ) : (
                      <button onClick={async () => {
                        await adminApi.enableUser(u.id);
                        qc.invalidateQueries(["admin-users"]);
                        toast.success("User enabled");
                      }} className="btn-secondary text-xs py-1.5 px-3 text-green-600 border-green-200 hover:bg-green-50 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Enable
                      </button>
                    )}
                    <select value={u.role}
                      onChange={async (e) => {
                        await adminApi.setRole(u.id, e.target.value as any);
                        qc.invalidateQueries(["admin-users"]);
                        toast.success("Role updated");
                      }}
                      className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700">
                      <option value="user">User</option>
                      <option value="vendor">Vendor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              ))}
              {(!users || users.length === 0) && (
                <div className="text-center py-12 text-gray-400">No users found</div>
              )}
            </div>
          </div>
        )}

        {/* Flagged reviews */}
        {tab === "reviews" && (
          <div className="space-y-3">
            {flaggedReviews?.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                <p>No flagged reviews. Everything looks clean!</p>
              </div>
            )}
            {flaggedReviews?.map((r: any) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{r.username}</span>
                      <div className="flex">
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} className={clsx("w-3.5 h-3.5", n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
                        ))}
                      </div>
                      <span className="badge bg-red-100 text-red-600 text-xs">{r.flag_count} flags</span>
                      {r.is_hidden && <span className="badge bg-gray-200 text-gray-600 text-xs">Hidden</span>}
                    </div>
                    <p className="text-sm text-gray-600">{r.body || <em className="text-gray-400">No body</em>}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!r.is_hidden ? (
                      <button onClick={async () => {
                        await adminApi.hideReview(r.id);
                        qc.invalidateQueries("admin-flagged");
                        toast.success("Review hidden");
                      }} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hide
                      </button>
                    ) : (
                      <button onClick={async () => {
                        await adminApi.unhideReview(r.id);
                        qc.invalidateQueries("admin-flagged");
                        toast.success("Review restored");
                      }} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
