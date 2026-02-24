"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

type Module = { _id: string; name: string; code: string; description: string; assignedTeacherId?: string; visibility: "public" | "private"; enrollmentType: "manual" | "enroll_key" | "open"; enrollKey?: string | null; startDate?: string | null; endDate?: string | null; isActive: boolean };
type Meta = { page: number; totalPages: number; total: number; search?: string };
type User = { _id: string; name: string; role: "admin" | "guru" | "user" };

export default function AdminModulesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Module[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "", assignedTeacherId: "", visibility: "private", enrollmentType: "manual", enrollKey: "", startDate: "", endDate: "", isActive: true });
  const [loading, setLoading] = useState(false);
  const [mobileMenuModule, setMobileMenuModule] = useState<Module | null>(null);

  const load = async (page = meta.page, searchQuery = "") => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (searchQuery) params.set("search", searchQuery);
      const res = await apiFetch<{ data: Module[]; meta: Meta }>(`/api/admin/modules?${params}`);
      setItems(res.data);
      setMeta(res.meta);
    } catch (err) {
      toast.error("Failed to load modules");
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await apiFetch<{ data: User[] }>("/api/admin/users?role=guru&limit=100");
      setTeachers(res.data.filter(u => u.role === "guru"));
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { load(1); loadTeachers(); }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { load(1, searchDebounce); }, [searchDebounce]);

  const create = async () => {
    if (!form.name || !form.description) { toast.warning("Name & description required"); return; }
    setLoading(true);
    try {
      await apiFetch("/api/admin/modules", { method: "POST", body: JSON.stringify({ ...form, assignedTeacherId: form.assignedTeacherId || undefined, enrollKey: form.enrollmentType === "enroll_key" ? form.enrollKey : null }) });
      setForm({ name: "", code: "", description: "", assignedTeacherId: "", visibility: "private", enrollmentType: "manual", enrollKey: "", startDate: "", endDate: "", isActive: true });
      setShowForm(false);
      await load();
      toast.success("Module created");
    } catch (e) {
      toast.error("Failed to create module");
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this module?")) return;
    try {
      await apiFetch(`/api/admin/modules/${id}`, { method: "DELETE" });
      await load();
      toast.success("Module deleted");
    } catch { toast.error("Failed to delete module"); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Modules</h1>
            <p className="text-sm text-gray-500 mt-1">Manage learning modules, phases, enrollments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="Search modules..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-10 w-64" style={{ paddingLeft: "2.3rem" }} />
            </div>
            <PrimaryButton onClick={() => setShowForm(true)} icon="plus">Module</PrimaryButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Module</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Visibility</th>
                <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Enrollment</th>
                <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Others</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon="book" title="No modules" description={search ? "Try another keyword" : "Create a module"} /></td></tr>
              ) : items.map((m) => (
                <tr key={m._id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <Link className="text-sm font-semibold text-emerald-700 hover:underline" href={`/admin/modules/${m._id}`}>{m.name}</Link>
                      <span className="text-xs text-gray-500">Code: {m.code}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">{m.visibility}</td>
                  <td className="hidden md:table-cell px-5 py-4 text-sm text-gray-700">{m.enrollmentType === "enroll_key" ? "enroll_key" : m.enrollmentType}</td>
                  <td className="hidden md:table-cell px-5 py-4">{m.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="hidden md:inline-flex items-center gap-2">
                      <Link href={`/admin/modules/${m._id}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Detail">
                        <i className="fas fa-eye" />
                      </Link>
                      <button onClick={() => remove(m._id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                    <button onClick={() => setMobileMenuModule(m)} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded" title="Others">
                      <i className="fas fa-ellipsis-v" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(showForm) && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-3xl p-6 space-y-5 relative">
            <button onClick={() => { setShowForm(false); }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><i className="fas fa-times" /></button>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900">Add Module</h2>
              <p className="text-xs text-gray-500">Isi data modul dan assign guru (opsional).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Name</label>
                <input className="input-base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama modul" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Code</label>
                <input className="input-base" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Otomatis jika kosong" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Assign Teacher</label>
                <select className="input-base" value={form.assignedTeacherId} onChange={(e) => setForm({ ...form, assignedTeacherId: e.target.value })}>
                  <option value="">-</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Visibility</label>
                <select className="input-base" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}>
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Enrollment Type</label>
                <select className="input-base" value={form.enrollmentType} onChange={(e) => setForm({ ...form, enrollmentType: e.target.value as any })}>
                  <option value="manual">Manual</option>
                  <option value="enroll_key">Enroll Key</option>
                  <option value="open">Open</option>
                </select>
              </div>
              {form.enrollmentType === "enroll_key" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Enroll Key</label>
                  <input className="input-base" value={form.enrollKey} onChange={(e) => setForm({ ...form, enrollKey: e.target.value })} placeholder="Key" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Start Date</label>
                <input className="input-base" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">End Date</label>
                <input className="input-base" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <textarea className="input-base" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi modul" />
            </div>

            <div className="flex items-center gap-2">
              <input id="m-active" type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              <label htmlFor="m-active" className="text-sm text-gray-700">Active</label>
            </div>

            <div className="flex justify-end gap-3">
              <PrimaryButton variant="secondary" onClick={() => setShowForm(false)}>Cancel</PrimaryButton>
              <PrimaryButton loading={loading} onClick={create}>Create Module</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {mobileMenuModule && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuModule(null)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{mobileMenuModule.name}</p>
                <p className="text-xs text-gray-500">Code: {mobileMenuModule.code}</p>
              </div>
              <button onClick={() => setMobileMenuModule(null)} className="text-gray-500"><i className="fas fa-times" /></button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
              <p>Visibility: <span className="font-medium">{mobileMenuModule.visibility}</span></p>
              <p>Enrollment: <span className="font-medium">{mobileMenuModule.enrollmentType}</span></p>
              <p>Status: <span className="font-medium">{mobileMenuModule.isActive ? "Active" : "Inactive"}</span></p>
            </div>

            <div className="space-y-2">
              <Link href={`/admin/modules/${mobileMenuModule._id}`} onClick={() => setMobileMenuModule(null)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700">
                <i className="fas fa-eye" /> Detail Module
              </Link>
              <button onClick={() => { remove(mobileMenuModule._id); setMobileMenuModule(null); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700">
                <i className="fas fa-trash" /> Delete Module
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
