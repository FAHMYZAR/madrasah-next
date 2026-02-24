"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined, password: password || undefined }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // admin/guru ke dashboard, user bisa diarahkan ke / (atau tetap admin jika mau debugging)
        if (data.user?.role === "user") router.push("/");
        else router.push("/admin");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-emerald-50 p-4">
      <div className="w-full max-w-4xl flex shadow-xl rounded-2xl overflow-hidden">
        <div className="hidden lg:flex lg:w-1/2 bg-emerald-600 flex-col items-center justify-center p-12 relative">
          <div className="relative z-10 text-center">
            <div className="w-32 h-32 mx-auto mb-8 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-emerald-600 text-4xl font-bold">M</span>
            </div>
            <h2 className="text-white text-3xl font-bold mb-4">Selamat Datang</h2>
            <p className="text-emerald-100 text-sm">MIS Madrasah - Sistem Pembelajaran & Quiz</p>
          </div>
        </div>

        <div className="w-full lg:w-1/2 bg-white p-8 lg:p-12">
          <div className="flex justify-center lg:hidden mb-8">
            <div className="w-20 h-20 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Login</h3>
          <p className="text-gray-500 text-sm mb-6">Admin/Guru gunakan Email + Password. Login siswa via mobile (NIM) tidak ditampilkan di form ini.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">Email</label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                <input
                  className="input-base pl-10"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@email.com"
                  disabled={loading}
                  style={{ paddingLeft: "2.3rem" }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                <input
                  className="input-base pl-10"
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{ paddingLeft: "2.3rem" }}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-circle text-red-500 mr-2"></i>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <PrimaryButton type="submit" loading={loading} className="w-full py-3">
              {loading ? "Memproses..." : "Login"}
            </PrimaryButton>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">© 2024 MIS Madrasah. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
