"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Opt = { _id: string; name: string; nim?: string; role?: string };

type EnrollmentItem = {
  _id: string;
  status: "active" | "inactive";
  enrolledAt: string;
  userId?: { _id?: string; name?: string; nim?: string } | string;
  moduleId?: { _id?: string; name?: string; code?: string } | string;
};

export default function AdminEnrollmentsPage() {
  const [items, setItems] = useState<EnrollmentItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [modules, setModules] = useState<Opt[]>([]);
  const [users, setUsers] = useState<Opt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ moduleId: "", userId: "", status: "active" as "active" | "inactive" });
  const [menuEnrollment, setMenuEnrollment] = useState<EnrollmentItem | null>(null);
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  const load = async (page = 1) => {
    const res = await apiFetch<{ data: EnrollmentItem[]; meta: any }>(`/api/admin/enrollments?page=${page}&limit=20`);
    setItems(res.data);
    setMeta(res.meta);
  };

  const loadOptions = async () => {
    const mods = await apiFetch<{ data: Opt[] }>("/api/admin/modules?page=1&limit=200");
    const us = await apiFetch<{ data: Opt[] }>("/api/admin/users?role=user&page=1&limit=500");
    setModules(mods.data || []);
    setUsers(us.data || []);
  };

  useEffect(() => {
    load(1).catch(() => {});
    loadOptions().catch(() => {});
  }, []);

  const createEnrollment = async () => {
    if (!form.moduleId || !form.userId) return;
    await apiFetch("/api/admin/enrollments", { method: "POST", body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ moduleId: "", userId: "", status: "active" });
    await load(1);
  };

  const updateEnrollment = async () => {
    if (!menuEnrollment) return;
    await apiFetch(`/api/admin/enrollments/${menuEnrollment._id}`, { method: "PATCH", body: JSON.stringify({ status: editStatus }) });
    setMenuEnrollment(null);
    await load(meta.page);
  };

  const deleteEnrollment = async () => {
    if (!menuEnrollment) return;
    await apiFetch(`/api/admin/enrollments/${menuEnrollment._id}`, { method: "DELETE" });
    setMenuEnrollment(null);
    await load(meta.page);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4 gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Enrollments</h1>
            <p className="text-sm text-gray-500">Monitoring dan enroll siswa ke module</p>
          </div>
          <PrimaryButton icon="plus" onClick={() => setShowForm(true)}>Enroll</PrimaryButton>
        </div>

        {items.length === 0 ? (
          <EmptyState icon="id-badge" title="No enrollments" description="" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Module</th>
                  <th className="px-4 py-3 text-right">Others</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((en) => (
                  <tr key={en._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{(en.userId as any)?.name || (en.userId as any)?.nim || en.userId}</span>
                        <span className="text-xs text-gray-500">NIM: {(en.userId as any)?.nim || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{(en.moduleId as any)?.name || en.moduleId}</span>
                        <span className="text-xs text-gray-500">Code: {(en.moduleId as any)?.code || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setMenuEnrollment(en); setEditStatus(en.status); }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="Others"
                      >
                        <i className="fas fa-ellipsis-v" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <PrimaryButton variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Prev</PrimaryButton>
            <span>Page {meta.page} of {meta.totalPages}</span>
            <PrimaryButton variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => load(meta.page + 1)}>Next</PrimaryButton>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold">Enroll User ke Module</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500"><i className="fas fa-times"/></button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Module</label>
              <select className="input-base" value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}>
                <option value="">Pilih module</option>
                {modules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">User (Siswa)</label>
              <select className="input-base" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Pilih user</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.nim})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Status</label>
              <select className="input-base" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <PrimaryButton variant="secondary" onClick={() => setShowForm(false)}>Cancel</PrimaryButton>
              <PrimaryButton onClick={createEnrollment}>Enroll</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {menuEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-t-2xl md:rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold">Enrollment Details</h3>
              <button onClick={() => setMenuEnrollment(null)} className="text-gray-500"><i className="fas fa-times"/></button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 space-y-1">
              <p>Status: <span className="font-medium">{menuEnrollment.status}</span></p>
              <p>Enrolled At: <span className="font-medium">{new Date(menuEnrollment.enrolledAt).toLocaleString()}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Edit Status</label>
              <select className="input-base" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <button onClick={updateEnrollment} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700">
                <i className="fas fa-save" /> Save Enrollment
              </button>
              <button onClick={deleteEnrollment} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700">
                <i className="fas fa-trash" /> Delete Enrollment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
