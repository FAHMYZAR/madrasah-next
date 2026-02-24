"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Badge } from "@/components/ui/Badge";

export default function AdminEnrollmentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const load = async (page = 1) => {
    const res = await apiFetch<{ data: any[]; meta: any }>(`/api/admin/enrollments?page=${page}&limit=20`);
    setItems(res.data);
    setMeta(res.meta);
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Enrollments</h1>
            <p className="text-sm text-gray-500">Monitoring siswa terdaftar per module</p>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState icon="id-badge" title="No enrollments" description="" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Module</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Enrolled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((en) => (
                <tr key={en._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{en.userId?.name || en.userId?.nim || en.userId}</span>
                      <span className="text-xs text-gray-500">NIM: {en.userId?.nim || "-"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{en.moduleId?.name || en.moduleId}</span>
                      <span className="text-xs text-gray-500">Code: {en.moduleId?.code || "-"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="success">{en.status}</Badge></td>
                  <td className="px-4 py-3">{new Date(en.enrolledAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {items.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <PrimaryButton variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Prev</PrimaryButton>
            <span>Page {meta.page} of {meta.totalPages}</span>
            <PrimaryButton variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => load(meta.page + 1)}>Next</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
