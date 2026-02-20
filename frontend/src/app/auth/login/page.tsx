"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { MapPin, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);
      setAuth(res.data.user, res.data.access_token);
      toast.success("Welcome back!");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-2xl text-gray-900">Spork'd</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="card p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm mb-6">Sign in to discover local food near you</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} required value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input pr-12" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{" "}
                <Link href="/auth/register" className="font-semibold text-brand-500 hover:text-brand-600">Join free</Link>
              </p>
            </div>

            {/* Demo credentials */}
            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
              <p className="font-semibold mb-1">Demo accounts:</p>
              <p>Admin: admin@sporkd.app / Admin1234!</p>
              <p>User: carol@example.com / Password1!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
