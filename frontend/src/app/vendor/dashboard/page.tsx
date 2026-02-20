"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { vendorApi, hoursApi, VendorDetail, WeeklyHour, HoursException } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { Settings, Clock, MapPin, Plus, Trash2, Save, Star, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "America/Toronto", "America/Vancouver", "Europe/London", "Europe/Paris",
];

const CATEGORY_OPTIONS = [
  { value: "food_truck", label: "Food Truck" },
  { value: "popup", label: "Pop-up" },
  { value: "bar", label: "Bar" },
  { value: "market_stall", label: "Market Stall" },
  { value: "cart", label: "Cart" },
  { value: "other", label: "Other" },
];

type Tab = "profile" | "hours" | "exceptions";

export default function VendorDashboard() {
  const { user, isVendor } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("profile");
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState<Record<string, unknown>>({});
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHour[]>([]);
  const [exceptions, setExceptions] = useState<HoursException[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({ name: "", category: "food_truck", timezone: "America/New_York", description: "" });

  useEffect(() => {
    if (!user) router.push("/auth/login");
    if (user && !isVendor()) router.push("/");
  }, [user, isVendor, router]);

  // Fetch vendor owned by this user
  const { data: searchResults } = useQuery(
    ["my-vendors"],
    () => vendorApi.search({ limit: 10 }).then((r) => r.data),
    { enabled: !!user }
  );

  // For now, demo: look for vendor in admin's list
  const { data: adminVendors } = useQuery(
    ["admin-my-vendors"],
    async () => {
      const { adminApi } = await import("@/lib/api");
      if (user?.role === "admin") return adminApi.getVendors({ limit: 100 }).then((r) => r.data.items);
      return [];
    },
    { enabled: user?.role === "admin" }
  );

  // Load specific vendor
  const { data: vendor } = useQuery<VendorDetail>(
    ["vendor-detail", vendorId],
    () => vendorId ? vendorApi.getBySlug(String(vendorId)).then((r) => r.data) : Promise.reject(),
    { enabled: !!vendorId }
  );

  const { data: weeklyData } = useQuery(
    ["weekly-hours", vendorId],
    () => hoursApi.getWeekly(vendorId!).then((r) => r.data),
    { enabled: !!vendorId, onSuccess: (d) => setWeeklyHours(d) }
  );

  const { data: exceptionsData } = useQuery(
    ["exceptions", vendorId],
    () => hoursApi.getExceptions(vendorId!).then((r) => r.data),
    { enabled: !!vendorId, onSuccess: (d) => setExceptions(d) }
  );

  const saveHours = async () => {
    if (!vendorId) return;
    try {
      await hoursApi.replaceWeekly(vendorId, weeklyHours);
      toast.success("Hours saved!");
      qc.invalidateQueries(["weekly-hours", vendorId]);
    } catch { toast.error("Couldn't save hours"); }
  };

  const addException = async (exc: HoursException) => {
    if (!vendorId) return;
    try {
      await hoursApi.addException(vendorId, exc);
      qc.invalidateQueries(["exceptions", vendorId]);
      toast.success("Exception added!");
    } catch { toast.error("Couldn't add exception"); }
  };

  const deleteException = async (excId: number) => {
    if (!vendorId) return;
    try {
      await hoursApi.deleteException(vendorId, excId);
      qc.invalidateQueries(["exceptions", vendorId]);
      toast.success("Exception removed");
    } catch { toast.error("Couldn't remove exception"); }
  };

  const updateHourSlot = (dow: number, idx: number, field: string, value: unknown) => {
    setWeeklyHours((prev) => prev.map((h) =>
      h.day_of_week === dow && h.interval_index === idx ? { ...h, [field]: value } : h
    ));
  };

  const addSlot = (dow: number) => {
    const existing = weeklyHours.filter((h) => h.day_of_week === dow);
    setWeeklyHours((prev) => [
      ...prev,
      { day_of_week: dow, is_closed: false, start_time_local: "09:00", end_time_local: "17:00", interval_index: existing.length }
    ]);
  };

  const removeSlot = (dow: number, idx: number) => {
    setWeeklyHours((prev) => prev.filter((h) => !(h.day_of_week === dow && h.interval_index === idx)));
  };

  const createVendor = async () => {
    try {
      const res = await vendorApi.create(newVendorForm);
      toast.success("Vendor created! Pending admin approval.");
      setShowCreateForm(false);
      setVendorId(res.data.id);
      qc.invalidateQueries(["my-vendors"]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Couldn't create vendor");
    }
  };

  const saveProfile = async () => {
    if (!vendorId) return;
    try {
      await vendorApi.update(vendorId, profileForm);
      qc.invalidateQueries(["vendor-detail", vendorId]);
      toast.success("Profile updated!");
    } catch { toast.error("Couldn't save profile"); }
  };

  // Init profile form from vendor
  useEffect(() => {
    if (vendor) {
      setProfileForm({
        name: vendor.name, description: vendor.description, category: vendor.category,
        address: vendor.address, city: vendor.city, state: vendor.state, zip_code: vendor.zip_code,
        latitude: vendor.latitude, longitude: vendor.longitude, timezone: vendor.timezone,
        phone: vendor.phone, website: vendor.website, instagram: vendor.instagram,
        tags: vendor.tags?.join(", ") || "",
      });
    }
  }, [vendor]);

  // Build daily hours structure
  const getDayHours = (dow: number) =>
    weeklyHours.filter((h) => h.day_of_week === dow).sort((a, b) => a.interval_index - b.interval_index);

  return (
    <div className="min-h-screen bg-surface-muted">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-500" /> Vendor Dashboard
          </h1>
        </div>

        {/* Vendor selector */}
        {!vendorId ? (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Your Vendors</h2>

            {adminVendors && adminVendors.length > 0 && (
              <div className="space-y-2 mb-4">
                {adminVendors.map((v: any) => (
                  <button key={v.id} onClick={() => setVendorId(v.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-orange-50 rounded-xl border border-gray-200 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900">{v.name}</p>
                      <p className="text-sm text-gray-500">{v.city}, {v.state} · {v.status}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setShowCreateForm(true)} className="btn-primary w-full">
              <Plus className="w-4 h-4" /> Create new vendor
            </button>

            {showCreateForm && (
              <div className="mt-5 p-5 bg-orange-50 rounded-2xl border border-orange-100 space-y-4">
                <h3 className="font-semibold text-gray-900">New Vendor</h3>
                <input type="text" placeholder="Vendor name" value={newVendorForm.name}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                  className="input" />
                <select value={newVendorForm.category}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, category: e.target.value })}
                  className="input">
                  {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={newVendorForm.timezone}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, timezone: e.target.value })}
                  className="input">
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
                <textarea placeholder="Description" rows={3}
                  value={newVendorForm.description}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, description: e.target.value })}
                  className="input resize-none" />
                <div className="flex gap-2">
                  <button onClick={createVendor} className="btn-primary flex-1">Create Vendor</button>
                  <button onClick={() => setShowCreateForm(false)} className="btn-secondary flex-1">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Back + vendor name */}
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setVendorId(null)} className="btn-ghost text-sm">← Back</button>
              <span className="font-bold text-gray-900">{vendor?.name}</span>
              {vendor && (
                <Link href={`/vendor/${vendor.slug}`} target="_blank"
                  className="text-xs text-brand-500 hover:underline">View public page ↗</Link>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 mb-6 w-fit">
              {(["profile", "hours", "exceptions"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                    tab === t ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100"
                  )}>
                  {t === "hours" ? "Weekly Hours" : t === "exceptions" ? "Special Hours" : "Profile"}
                </button>
              ))}
            </div>

            {/* Profile tab */}
            {tab === "profile" && (
              <div className="card p-6 space-y-4">
                <h2 className="font-bold text-gray-900 text-lg">Vendor Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Vendor name</label>
                    <input className="input" value={String(profileForm.name || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                    <select className="input" value={String(profileForm.category || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}>
                      {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                    <textarea rows={3} className="input resize-none" value={String(profileForm.description || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
                    <input className="input" value={String(profileForm.address || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
                    <input className="input" value={String(profileForm.city || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                    <input className="input" value={String(profileForm.state || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Timezone (IANA)</label>
                    <select className="input" value={String(profileForm.timezone || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}>
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Latitude</label>
                    <input type="number" step="any" className="input" value={String(profileForm.latitude || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, latitude: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Longitude</label>
                    <input type="number" step="any" className="input" value={String(profileForm.longitude || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, longitude: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                    <input className="input" value={String(profileForm.phone || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Website</label>
                    <input type="url" className="input" value={String(profileForm.website || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Instagram</label>
                    <input className="input" placeholder="@handle" value={String(profileForm.instagram || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, instagram: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tags (comma-separated)</label>
                    <input className="input" placeholder="bbq, southern, smoked-meats" value={String(profileForm.tags || "")}
                      onChange={(e) => setProfileForm({ ...profileForm, tags: e.target.value })} />
                  </div>
                </div>
                <button onClick={saveProfile} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Profile
                </button>
              </div>
            )}

            {/* Weekly hours tab */}
            {tab === "hours" && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-500" /> Weekly Hours
                  </h2>
                  <button onClick={saveHours} className="btn-primary text-sm flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Hours
                  </button>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl mb-5 text-xs text-blue-700 flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Times are stored in the vendor's local timezone ({vendor?.timezone}). DST is handled automatically — store wall-clock times, not UTC.</p>
                </div>
                <div className="space-y-4">
                  {DAYS.map((dayName, dow) => {
                    const slots = getDayHours(dow);
                    const isClosedDay = slots.length === 0 || slots.every((s) => s.is_closed);
                    return (
                      <div key={dow} className="border border-gray-200 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900 w-24">{dayName}</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox"
                                checked={!isClosedDay}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    addSlot(dow);
                                  } else {
                                    setWeeklyHours((prev) => prev.filter((h) => h.day_of_week !== dow));
                                  }
                                }}
                                className="w-4 h-4 rounded" />
                              <span className="text-sm text-gray-600">{isClosedDay ? "Closed" : "Open"}</span>
                            </label>
                          </div>
                          {!isClosedDay && (
                            <button onClick={() => addSlot(dow)} className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Add interval
                            </button>
                          )}
                        </div>
                        {!isClosedDay && slots.map((slot) => (
                          <div key={slot.interval_index} className="flex items-center gap-3 mb-2">
                            <input type="time" value={slot.start_time_local || ""}
                              onChange={(e) => updateHourSlot(dow, slot.interval_index, "start_time_local", e.target.value)}
                              className="input py-1.5 text-sm w-32" />
                            <span className="text-gray-400">–</span>
                            <input type="time" value={slot.end_time_local || ""}
                              onChange={(e) => updateHourSlot(dow, slot.interval_index, "end_time_local", e.target.value)}
                              className="input py-1.5 text-sm w-32" />
                            <button onClick={() => removeSlot(dow, slot.interval_index)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Exceptions tab */}
            {tab === "exceptions" && (
              <div className="card p-6">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-brand-500" /> Special Hours / Exceptions
                </h2>
                <ExceptionForm onAdd={addException} />
                <div className="mt-5 space-y-2">
                  {exceptions.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-6">No special hours set.</p>
                  )}
                  {exceptions.map((exc) => (
                    <div key={exc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{exc.exception_date}</p>
                        {exc.is_closed ? (
                          <p className="text-xs text-red-500">Closed all day{exc.note ? ` — ${exc.note}` : ""}</p>
                        ) : (
                          <p className="text-xs text-gray-500">{exc.start_time_local} – {exc.end_time_local}{exc.note ? ` — ${exc.note}` : ""}</p>
                        )}
                      </div>
                      <button onClick={() => exc.id && deleteException(exc.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExceptionForm({ onAdd }: { onAdd: (exc: HoursException) => void }) {
  const [form, setForm] = useState<HoursException>({
    exception_date: "", is_closed: false, start_time_local: "09:00", end_time_local: "17:00", note: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.exception_date) return;
    onAdd(form);
    setForm({ exception_date: "", is_closed: false, start_time_local: "09:00", end_time_local: "17:00", note: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Add Special Date</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
          <input type="date" required className="input text-sm py-2" value={form.exception_date}
            onChange={(e) => setForm({ ...form, exception_date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Note (optional)</label>
          <input type="text" className="input text-sm py-2" placeholder="e.g., Holiday" value={form.note || ""}
            onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_closed}
          onChange={(e) => setForm({ ...form, is_closed: e.target.checked })} className="w-4 h-4 rounded" />
        <span className="text-sm text-gray-700">Closed all day</span>
      </label>
      {!form.is_closed && (
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Opens</label>
            <input type="time" className="input text-sm py-2 w-32" value={form.start_time_local || ""}
              onChange={(e) => setForm({ ...form, start_time_local: e.target.value })} />
          </div>
          <span className="text-gray-400 mt-5">–</span>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Closes</label>
            <input type="time" className="input text-sm py-2 w-32" value={form.end_time_local || ""}
              onChange={(e) => setForm({ ...form, end_time_local: e.target.value })} />
          </div>
        </div>
      )}
      <button type="submit" className="btn-primary text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" /> Add Exception
      </button>
    </form>
  );
}
