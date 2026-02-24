"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type User = { _id: string; nim: string; name: string; role: "admin" | "guru" | "user"; className?: string; isActive: boolean; profile_url?: string | null };
type Meta = { page: number; totalPages: number; total: number; role?: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, totalPages: 1, total: 0 });
  const [form, setForm] = useState({ nim: "", name: "", className: "", password: "", role: "user" as "admin" | "guru" | "user", isActive: true });
  const [profile, setProfile] = useState<File | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const load = async (page = meta.page, role = roleFilter) => {
    const qs = new URLSearchParams({ page: String(page), limit: "10" });
    if (role) qs.set("role", role);
    const res = await apiFetch<{ data: User[]; meta: Meta }>(`/api/admin/users?${qs}`);
    setUsers(res.data);
    setMeta(res.meta);
  };
  useEffect(() => { load(1); }, []);
  useEffect(() => { load(1, roleFilter); }, [roleFilter]);

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(""), 2500); };

  const create = async () => {
    if (!form.name || !form.nim || !form.password) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("nim", form.nim);
    fd.append("password", form.password);
    fd.append("role", form.role);
    fd.append("className", form.className);
    fd.append("isActive", String(form.isActive));
    if (profile) fd.append("profile_url", profile);
    await fetch("/api/admin/users", { method: "POST", body: fd, credentials: "include" });
    setForm({ nim: "", name: "", className: "", password: "", role: "user", isActive: true });
    setProfile(null);
    await load();
    setLoading(false);
    showSuccess("User created successfully!");
  };

  const update = async () => {
    if (!editing) return;
    setLoading(true);
    await apiFetch(`/api/admin/users/${editing._id}`, { method: "PATCH", body: JSON.stringify({ name: editing.name, nim: editing.nim, role: editing.role, className: editing.className, isActive: editing.isActive }) });
    setEditing(null);
    await load();
    setLoading(false);
    showSuccess("User updated successfully!");
  };

  const deactivate = async (id: string, val: boolean) => {
    await apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: val }) });
    await load();
    showSuccess(val ? "User activated" : "User deactivated");
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    await load();
    showSuccess("User deleted successfully!");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-3 text-sm text-emerald-800">{success}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Users Management</h1>
            <p className="text-sm text-gray-500">Kelola admin/guru/siswa</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-base">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="guru">Guru</option>
              <option value="user">User</option>
            </select>
            <PrimaryButton onClick={() => { if (editing) { setEditing(null); } else { setForm({ ...form }); setProfile(null); } }} icon={(editing || form.name) ? "times" : "plus"}>
              {(editing || form.name) ? "Close" : "Add User"}
            </PrimaryButton>
          </div>
        </div>

        {(editing || form.name || form.nim) && (
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-base font-semibold text-gray-900 mb-3">{editing ? "Edit User" : "Add User"}</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">NIM</label>
                  <input className="input-base" value={editing ? editing.nim : form.nim} onChange={(e) => editing ? setEditing({ ...editing, nim: e.target.value }) : setForm({ ...form, nim: e.target.value })} placeholder="NIM unik" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <input className="input-base" value={editing ? editing.name : form.name} onChange={(e) => editing ? setEditing({ ...editing, name: e.target.value }) : setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                  <select className="input-base" value={editing ? editing.role : form.role} onChange={(e) => editing ? setEditing({ ...editing, role: e.target.value as any }) : setForm({ ...form, role: e.target.value as any })}>
                    <option value="user">User</option>
                    <option value="guru">Guru</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
                  <input className="input-base" value={editing ? (editing.className || "") : form.className} onChange={(e) => editing ? setEditing({ ...editing, className: e.target.value }) : setForm({ ...form, className: e.target.value })} placeholder="Kelas (opsional)" />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input id="active" type="checkbox" checked={editing ? editing.isActive : form.isActive} onChange={(e) => editing ? setEditing({ ...editing, isActive: e.target.checked }) : setForm({ ...form, isActive: e.target.checked })} />
                  <label htmlFor="active" className="text-sm text-gray-700">Active</label>
                </div>
              </div>

              {!editing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password (untuk admin/guru)</label>
                    <input className="input-base" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture</label>
                    <input className="input-base" type="file" accept="image/*" onChange={(e) => setProfile(e.target.files?.[0] || null)} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                {editing && <PrimaryButton type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</PrimaryButton>}
                <PrimaryButton type="button" onClick={editing ? update : create} loading={loading}>
                  {loading ? "Saving..." : (editing ? "Update User" : "Create User")}
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon="users" title="No users" description="Tambah user" /></td></tr>
              ) : users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">{u.name}</span>
                      <span className="text-xs text-gray-500">NIM: {u.nim}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge variant={u.role === "admin" ? "danger" : u.role === "guru" ? "info" : "neutral"}>{u.role}</Badge></td>
                  <td className="px-5 py-4 text-sm text-gray-600">{u.className || "-"}</td>
                  <td className="px-5 py-4">{u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}</td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button onClick={() => setEditing(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"><i className="fas fa-edit" /></button>
                    <button onClick={() => deactivate(u._id, !u.isActive)} className="p-2 text-amber-600 hover:bg-amber-50 rounded" title="Toggle active"><i className="fas fa-power-off" /></button>
                    <button onClick={() => remove(u._id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><i className="fas fa-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
