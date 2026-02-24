"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

type PendingItem = {
  user_answer_id: string;
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  question_id: string;
  question_text: string;
  points: number;
  answer_text: string;
  student: { id: string; name: string; email: string } | null;
};

export default function GradingPage() {
  const toast = useToast();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  const grade = async (item: PendingItem, pts: number, correct: boolean) => {
    try {
      await apiFetch("/api/admin/attempts/grade", {
        method: "POST",
        body: JSON.stringify({ user_answer_id: item.user_answer_id, awarded_points: pts, is_correct: correct }),
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

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <EmptyState icon="check-circle" title="Tidak ada antrian grading" description="Semua jawaban essay sudah dinilai." />
        ) : (
          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.user_answer_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{it.quiz_title}</p>
                    <p className="text-xs text-gray-500">{it.student?.name} ({it.student?.email})</p>
                  </div>
                  <p className="text-xs text-gray-500">Max points: {it.points}</p>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-900">Q: {it.question_text}</p>
                <div className="mt-2 bg-gray-50 rounded-md p-3 text-sm text-gray-700">
                  {it.answer_text || "(Kosong)"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <PrimaryButton size="sm" onClick={() => grade(it, it.points, true)}>Mark Correct ({it.points})</PrimaryButton>
                  <PrimaryButton size="sm" variant="secondary" onClick={() => grade(it, Math.floor(it.points / 2), false)}>Partial ({Math.floor(it.points / 2)})</PrimaryButton>
                  <PrimaryButton size="sm" variant="danger" onClick={() => grade(it, 0, false)}>Mark Wrong (0)</PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
