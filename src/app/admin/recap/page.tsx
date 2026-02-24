"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type RecapData = {
  summary: {
    totalStudents: number;
    totalModules: number;
    totalQuizzes: number;
    totalAttempts: number;
    averageScore: number;
    passed: number;
    failed: number;
  };
  filters: {
    modules: { _id: string; name: string }[];
    quizzes: { _id: string; title: string; moduleId: string }[];
    classes: string[];
  };
  moduleStats: {
    moduleId: string;
    moduleName: string;
    moduleCode: string;
    quizzesCount: number;
    totalStudents: number;
    totalAttempts: number;
    averageScore: number;
  }[];
  trend: { date: string; attempts: number; averageScore: number }[];
  rows: {
    attemptId: string;
    studentName: string;
    nim: string;
    className: string;
    moduleName: string;
    quizTitle: string;
    status: string;
    score: number | null;
    passScore: number;
    submittedAt: string | null;
  }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export default function AdminRecapPage() {
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mobileModuleSheet, setMobileModuleSheet] = useState<RecapData["moduleStats"][number] | null>(null);

  const [search, setSearch] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [quizId, setQuizId] = useState("");
  const [className, setClassName] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const visibleQuizzes = useMemo(() => {
    if (!data) return [];
    if (!moduleId) return data.filters.quizzes;
    return data.filters.quizzes.filter((q) => q.moduleId === moduleId);
  }, [data, moduleId]);

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "15" });
      if (search) params.set("search", search);
      if (moduleId) params.set("moduleId", moduleId);
      if (quizId) params.set("quizId", quizId);
      if (className) params.set("className", className);
      if (status) params.set("status", status);

      const res = await apiFetch<RecapData>(`/api/admin/recap?${params.toString()}`);
      setData(res);
      setPage(targetPage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);
  useEffect(() => { setQuizId(""); }, [moduleId]);

  const exportCsv = () => {
    if (!data?.rows?.length) return;
    const header = ["studentName", "nim", "className", "moduleName", "quizTitle", "status", "score", "passScore", "submittedAt"];
    const lines = data.rows.map((r) => [
      r.studentName,
      r.nim,
      r.className,
      r.moduleName,
      r.quizTitle,
      r.status,
      r.score ?? "",
      r.passScore,
      r.submittedAt ? new Date(r.submittedAt).toISOString() : "",
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recap-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h1 className="text-lg font-semibold text-gray-900">Rekap Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Ringkasan alur LMS, performa modul, dan nilai seluruh siswa.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input className="input-base md:col-span-2" placeholder="Search nama, NIM, quiz, modul" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input-base" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="">Semua Modul</option>
            {data?.filters.modules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
          <select className="input-base" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
            <option value="">Semua Quiz</option>
            {visibleQuizzes.map((q) => <option key={q._id} value={q._id}>{q.title}</option>)}
          </select>
          <select className="input-base" value={className} onChange={(e) => setClassName(e.target.value)}>
            <option value="">Semua Kelas</option>
            {data?.filters.classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-base" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="in_progress">in_progress</option>
            <option value="submitted">submitted</option>
            <option value="graded">graded</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:justify-end">
          <PrimaryButton className="w-full" variant="secondary" onClick={exportCsv}>Export CSV</PrimaryButton>
          <PrimaryButton className="w-full" variant="secondary" onClick={() => { setSearch(""); setModuleId(""); setQuizId(""); setClassName(""); setStatus(""); setTimeout(() => load(1), 0); }}>Reset</PrimaryButton>
          <PrimaryButton className="w-full" onClick={() => load(1)} loading={loading}>Apply</PrimaryButton>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card title="Students" value={data?.summary.totalStudents ?? 0} />
        <Card title="Modules" value={data?.summary.totalModules ?? 0} />
        <Card title="Quizzes" value={data?.summary.totalQuizzes ?? 0} />
        <Card title="Attempts" value={data?.summary.totalAttempts ?? 0} />
        <Card title="Avg Score" value={data?.summary.averageScore ?? 0} />
        <Card title="Passed" value={data?.summary.passed ?? 0} tone="green" />
        <Card title="Failed" value={data?.summary.failed ?? 0} tone="red" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Trend Nilai (30 hari terakhir)</h2>
        {!data || data.trend.length === 0 ? (
          <EmptyState icon="chart-line" title="Belum ada trend" description="Belum ada attempt dengan score." />
        ) : (
          <div className="space-y-2">
            {data.trend.map((t) => {
              const width = Math.max(4, Math.min(100, t.averageScore));
              return (
                <div key={t.date} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-3 md:col-span-2 text-gray-600">{t.date}</div>
                  <div className="col-span-6 md:col-span-8 h-2 bg-gray-100 rounded">
                    <div className="h-2 bg-emerald-500 rounded" style={{ width: `${width}%` }} />
                  </div>
                  <div className="col-span-3 md:col-span-2 text-right text-gray-700">{t.averageScore} ({t.attempts})</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Rekap Per Modul</h2>
        {(!data || data.moduleStats.length === 0) ? (
          <EmptyState icon="book" title="Belum ada data modul" description="" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Module</th>
                    <th className="px-3 py-2 text-left">Students</th>
                    <th className="px-3 py-2 text-left">Quizzes</th>
                    <th className="px-3 py-2 text-left">Attempts</th>
                    <th className="px-3 py-2 text-left">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.moduleStats.map((m) => (
                    <tr key={m.moduleId}>
                      <td className="px-3 py-2">{m.moduleName}</td>
                      <td className="px-3 py-2">{m.totalStudents}</td>
                      <td className="px-3 py-2">{m.quizzesCount}</td>
                      <td className="px-3 py-2">{m.totalAttempts}</td>
                      <td className="px-3 py-2">{m.averageScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {data.moduleStats.map((m) => (
                <div key={m.moduleId} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{m.moduleName}</p>
                      <p className="text-xs text-gray-500 mt-1">Avg Score: <span className="font-medium text-gray-700">{m.averageScore}</span></p>
                    </div>
                    <button onClick={() => setMobileModuleSheet(m)} className="p-2 rounded-lg border border-gray-200 text-gray-600" title="Others">
                      <i className="fas fa-ellipsis-v" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Nilai Siswa</h2>
        {!data || data.rows.length === 0 ? (
          <EmptyState icon="inbox" title="Tidak ada data nilai" description="Coba ubah filter pencarian" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Module</th>
                    <th className="px-3 py-2 text-left">Quiz</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Score</th>
                    <th className="px-3 py-2 text-left">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.rows.map((r) => (
                    <tr key={r.attemptId}>
                      <td className="px-3 py-2">{r.studentName} ({r.nim})</td>
                      <td className="px-3 py-2">{r.moduleName}</td>
                      <td className="px-3 py-2">{r.quizTitle}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">{r.score ?? "-"} / {r.passScore}</td>
                      <td className="px-3 py-2">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {data.rows.map((r) => (
                <div key={r.attemptId} className="rounded-lg border border-gray-200 p-3">
                  <p className="font-semibold text-sm text-gray-900">{r.studentName} <span className="text-xs text-gray-500">({r.nim})</span></p>
                  <p className="text-xs text-gray-600 mt-1">{r.moduleName} • {r.quizTitle}</p>
                  <div className="mt-2 flex justify-between text-xs">
                    <span>Status: {r.status}</span>
                    <span>Score: {r.score ?? "-"}/{r.passScore}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <PrimaryButton variant="secondary" size="sm" disabled={(data.meta.page || 1) <= 1} onClick={() => load((data.meta.page || 1) - 1)}>Prev</PrimaryButton>
              <span className="text-xs text-gray-500">Page {data.meta.page} / {data.meta.totalPages} ({data.meta.total})</span>
              <PrimaryButton variant="secondary" size="sm" disabled={(data.meta.page || 1) >= (data.meta.totalPages || 1)} onClick={() => load((data.meta.page || 1) + 1)}>Next</PrimaryButton>
            </div>
          </>
        )}
      </div>

      {mobileModuleSheet && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileModuleSheet(null)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{mobileModuleSheet.moduleName}</p>
                <p className="text-xs text-gray-500">Detail Rekap Modul</p>
              </div>
              <button onClick={() => setMobileModuleSheet(null)} className="text-gray-500"><i className="fas fa-times" /></button>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 space-y-1">
              <p>Students: <span className="font-medium">{mobileModuleSheet.totalStudents}</span></p>
              <p>Quizzes: <span className="font-medium">{mobileModuleSheet.quizzesCount}</span></p>
              <p>Attempts: <span className="font-medium">{mobileModuleSheet.totalAttempts}</span></p>
              <p>Avg Score: <span className="font-medium">{mobileModuleSheet.averageScore}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value, tone = "default" }: { title: string; value: number; tone?: "default" | "green" | "red" }) {
  const toneClass = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-700" : "text-gray-900";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-[11px] text-gray-500">{title}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
