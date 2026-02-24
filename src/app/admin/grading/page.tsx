"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

type PendingItem = {
  userAnswerId?: string;
  attemptId?: string;
  quizId?: string;
  quizTitle?: string;
  questionId?: string;
  questionText?: string;
  points: number;
  answerText?: string;
  student: { id: string; name: string; email: string } | null;
  // backward compatibility
  user_answer_id?: string;
  attempt_id?: string;
  quiz_id?: string;
  quiz_title?: string;
  question_id?: string;
  question_text?: string;
  answer_text?: string;
};

export default function GradingPage() {
  const toast = useToast();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [quizFilter, setQuizFilter] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<PendingItem[]>("/api/admin/attempts/pending");
      setItems(data || []);
    } catch {
      toast.error("Failed to load pending grading");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const quizOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) {
      const qt = it.quizTitle || it.quiz_title;
      if (qt) s.add(qt);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const quizTitle = (it.quizTitle || it.quiz_title || "").toLowerCase();
      const questionText = (it.questionText || it.question_text || "").toLowerCase();
      const answerText = (it.answerText || it.answer_text || "").toLowerCase();
      const studentName = (it.student?.name || "").toLowerCase();
      const studentEmail = (it.student?.email || "").toLowerCase();

      const matchQuiz = !quizFilter || (it.quizTitle || it.quiz_title) === quizFilter;
      const matchSearch = !q || [quizTitle, questionText, answerText, studentName, studentEmail].some((v) => v.includes(q));
      return matchQuiz && matchSearch;
    });
  }, [items, search, quizFilter]);

  const grade = async (item: PendingItem, pts: number, correct: boolean) => {
    try {
      await apiFetch("/api/admin/attempts/grade", {
        method: "POST",
        body: JSON.stringify({ user_answer_id: item.userAnswerId || item.user_answer_id, awarded_points: pts, is_correct: correct }),
      });
      toast.success("Grading saved");
      await load();
    } catch {
      toast.error("Failed to save grading");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h1 className="text-lg font-semibold text-gray-900">Manual Grading (Essay)</h1>
        <p className="text-sm text-gray-500 mt-1">Review jawaban essay murid yang belum auto-graded.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="input-base pl-10"
              placeholder="Cari quiz, siswa, soal, atau isi jawaban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2.3rem" }}
            />
          </div>
          <select className="input-base" value={quizFilter} onChange={(e) => setQuizFilter(e.target.value)}>
            <option value="">Semua Quiz</option>
            {quizOptions.map((qz) => (
              <option key={qz} value={qz}>{qz}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-gray-500">Menampilkan {filteredItems.length} dari {items.length} item</div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : filteredItems.length === 0 ? (
          <EmptyState icon="check-circle" title="Tidak ada data sesuai filter" description="Coba ganti kata kunci/filter atau semua jawaban sudah dinilai." />
        ) : (
          <div className="space-y-4">
            {filteredItems.map((it, idx) => (
              <div key={it.userAnswerId || it.user_answer_id || `${it.questionId || it.question_id}-${idx}`} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{it.quizTitle || it.quiz_title}</p>
                    <p className="text-xs text-gray-500">{it.student?.name} ({it.student?.email})</p>
                  </div>
                  <p className="text-xs text-gray-500">Max points: {it.points}</p>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-900">Q: {it.questionText || it.question_text}</p>
                <div className="mt-2 bg-gray-50 rounded-md p-3 text-sm text-gray-700">
                  {it.answerText || it.answer_text || "(Kosong)"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <PrimaryButton size="sm" onClick={() => grade(it, it.points, true)}>Sempurna ({it.points})</PrimaryButton>
                  <PrimaryButton size="sm" variant="secondary" onClick={() => grade(it, Math.floor(it.points / 2), false)}>Setengah ({Math.floor(it.points / 2)})</PrimaryButton>
                  <PrimaryButton size="sm" variant="danger" onClick={() => grade(it, 0, false)}>Salah (0)</PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
