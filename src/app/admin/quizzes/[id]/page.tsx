"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

type Option = { _id: string; option_text: string; is_correct?: boolean };
type Question = { _id: string; question_text: string; question_type?: string; points?: number; options: Option[] };
type QuizDetail = {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  duration_minutes?: number;
  pass_score?: number;
  start_at?: string | null;
  end_at?: string | null;
  questions?: Question[];
};

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const quizId = params?.id as string;

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"multiple_choice" | "essay">("multiple_choice");
  const [questionPoints, setQuestionPoints] = useState(10);
  const [essayKey, setEssayKey] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<QuizDetail>(`/api/admin/quizzes/${quizId}`);
      setQuiz(res);
      setQuestions(res.questions || []);
    } catch {
      toast.error("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (quizId) loadQuiz(); }, [quizId]);

  const createQuestion = async () => {
    if (!quizId) return;
    if (!questionText.trim()) return toast.warning("Question text is required");
    if (questionType === "multiple_choice" && opts.some((o) => !o.trim())) return toast.warning("All options required for multiple choice");

    try {
      await apiFetch(`/api/admin/quizzes/${quizId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          question_text: questionText.trim(),
          question_type: questionType,
          points: questionPoints,
          answer_key_text: questionType === "essay" ? essayKey : "",
          options: questionType === "multiple_choice" ? opts.map((o, i) => ({ option_text: o.trim(), is_correct: i === correctIndex })) : [],
        }),
      });
      setQuestionText("");
      setQuestionType("multiple_choice");
      setQuestionPoints(10);
      setEssayKey("");
      setOpts(["", "", "", ""]);
      setCorrectIndex(0);
      await loadQuiz();
      toast.success("Question added");
    } catch {
      toast.error("Failed to add question");
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await apiFetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      await loadQuiz();
      toast.success("Question deleted");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const deleteOption = async (id: string) => {
    if (!confirm("Delete this option?")) return;
    try {
      await apiFetch(`/api/admin/options/${id}`, { method: "DELETE" });
      await loadQuiz();
      toast.success("Option deleted");
    } catch {
      toast.error("Failed to delete option");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 cursor-pointer" onClick={() => router.push("/admin/quizzes")}>← Back to Quizzes</p>
            <h1 className="text-xl font-semibold text-gray-900">{quiz?.title || "Quiz"}</h1>
            <p className="text-sm text-gray-600 mt-1">{quiz?.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              <Badge variant="info" size="sm">Status: {quiz?.status || "draft"}</Badge>
              <Badge variant="neutral" size="sm">Duration: {quiz?.duration_minutes || 30} min</Badge>
              <Badge variant="success" size="sm">Pass: {quiz?.pass_score || 70}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Add Question</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Question Text</label>
            <input className="input-base" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Tulis pertanyaan" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select className="input-base" value={questionType} onChange={(e) => setQuestionType(e.target.value as any)}>
                <option value="multiple_choice">Pilihan Ganda</option>
                <option value="essay">Essay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Points</label>
              <input className="input-base" type="number" min={1} max={100} value={questionPoints} onChange={(e) => setQuestionPoints(Number(e.target.value || 10))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Essay Answer Key (optional)</label>
              <input className="input-base" value={essayKey} onChange={(e) => setEssayKey(e.target.value)} disabled={questionType !== "essay"} />
            </div>
          </div>
          {questionType === "multiple_choice" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {opts.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                  <input className="input-base" placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setOpts((prev) => prev.map((p, idx) => idx === i ? e.target.value : p))} />
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <PrimaryButton onClick={createQuestion}>Add Question</PrimaryButton>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Questions</h2>
        {loading ? <p className="text-sm text-gray-500">Loading...</p> : questions.length === 0 ? (
          <EmptyState icon="question-circle" title="No questions" description="Tambahkan soal pertama" />
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{q.question_text}</p>
                    <p className="text-xs text-gray-500">Type: {q.question_type || "multiple_choice"} • Points: {q.points || 10}</p>
                  </div>
                  <button onClick={() => deleteQuestion(q._id)} className="text-red-600 hover:text-red-700"><i className="fas fa-trash" /></button>
                </div>
                {q.question_type !== "essay" && (
                  <ul className="mt-2 space-y-1">
                    {q.options?.map((o) => (
                      <li key={o._id} className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2">
                        <span className="flex items-center gap-2">
                          {o.is_correct ? <i className="fas fa-check-circle text-emerald-600" /> : <i className="far fa-circle text-gray-400" />}
                          {o.option_text}
                        </span>
                        <button onClick={() => deleteOption(o._id)} className="text-red-500 hover:text-red-700"><i className="fas fa-times" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
