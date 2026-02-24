"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/client/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DashboardCard } from "@/components/ui/DashboardCard";

export default function AdminProfilePage() {
  const [form, setForm] = useState({ name: "", email: "", profile_url: "" });
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pw, setPw] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const user = await apiFetch<any>("/api/admin/profile");
    setForm({ name: user?.name || "", email: user?.email || "", profile_url: user?.profile_url || "" });
  };

  useEffect(() => { load(); }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setProfileFile(file);
  };

  const saveProfile = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("email", form.email);
    if (profileFile) fd.append("profile_url", profileFile);

    await fetch("/api/admin/profile", { method: "PATCH", body: fd, credentials: "include" });
    setLoading(false);
    showSuccess("Profile updated successfully!");
    await load();
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const savePassword = async () => {
    if (pw.password !== pw.password_confirmation) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    await apiFetch("/api/admin/profile/password", { method: "PUT", body: JSON.stringify(pw) });
    setPw({ current_password: "", password: "", password_confirmation: "" });
    setLoading(false);
    showSuccess("Password updated successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Success Message */}
      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <i className="fas fa-check-circle text-emerald-500 text-lg mr-3"></i>
              <p className="text-sm text-emerald-800">{success}</p>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-700">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Profile Information Card */}
      <DashboardCard
        title="Profile Information"
        description="Update your account information and profile photo"
      >
        <form className="space-y-6">
          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Photo</label>
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} className="h-20 w-20 rounded-full object-cover" alt="Preview" />
                ) : form.profile_url ? (
                  <img src={form.profile_url} alt={form.name} className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-xl font-semibold text-emerald-600">
                      {form.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  id="profile_url"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <label 
                  htmlFor="profile_url" 
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <i className="fas fa-upload mr-2"></i>
                  Change Photo
                </label>
                <p className="mt-2 text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
              </div>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="name">
              Full Name
            </label>
            <input 
              type="text" 
              id="name" 
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-base"
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
              Email Address
            </label>
            <input 
              type="email" 
              id="email" 
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-base"
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <PrimaryButton 
              type="button" 
              onClick={saveProfile}
              loading={loading}
            >
              {loading ? "Saving..." : "Update Profile"}
            </PrimaryButton>
          </div>
        </form>
      </DashboardCard>

      {/* Password Change Card */}
      <DashboardCard
        title="Change Password"
        description="Update your password to keep your account secure"
      >
        <form className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="current_password">
              Current Password
            </label>
            <input 
              type="password" 
              id="current_password" 
              value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
              className="input-base"
              placeholder="Enter current password"
              required
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
              New Password
            </label>
            <input 
              type="password" 
              id="password" 
              value={pw.password}
              onChange={(e) => setPw({ ...pw, password: e.target.value })}
              className="input-base"
              placeholder="Enter new password"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password_confirmation">
              Confirm New Password
            </label>
            <input 
              type="password" 
              id="password_confirmation" 
              value={pw.password_confirmation}
              onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })}
              className="input-base"
              placeholder="Confirm new password"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <PrimaryButton 
              type="button" 
              onClick={savePassword}
              loading={loading}
              variant="primary"
            >
              {loading ? "Saving..." : "Update Password"}
            </PrimaryButton>
          </div>
        </form>
      </DashboardCard>
    </div>
  );
}
