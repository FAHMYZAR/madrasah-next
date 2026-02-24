"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

type Quiz = { _id: string; title: string; description?: string; module_id?: string; createdAt: string; questions_count?: number; status?: "draft"|"published"|"active"|"archived"; duration_minutes?: number; pass_score?: number; started_at?: string | null; ended_at?: string | null };
type Module = { _id: string; title: string };
type Option = { _id: string; option_text: string; is_correct?: boolean };
type Question = { _id: string; question_text: string; options: Option[] };
type Meta = { page: number; totalPages: number; total: number };

export default function AdminQuizzesPage() {
  const toast = useToast();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, totalPages: 1, total: 0 });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [formModuleId, setFormModuleId] = useState("");
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [status, setStatus] = useState("draft");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passScore, setPassScore] = useState(70);
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");

  const [activeQuizId, setActiveQuizId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"multiple_choice" | "essay">("multiple_choice");
  const [questionPoints, setQuestionPoints] = useState(10);
  const [essayKey, setEssayKey] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const activeQuiz = useMemo(() => quizzes.find((q) => q._id === activeQuizId), [quizzes, activeQuizId]);

  const loadModules = async () => {
    try {
      const res = await apiFetch<{ data: Module[] }>("/api/admin/modules?limit=100");
      setModules(res.data || []);
    } catch {
      setModules([]);
    }
  };

  const load = async (page = meta.page, searchQuery = "", moduleId = "") => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (searchQuery) params.set("search", searchQuery);
      if (moduleId) params.set("module_id", moduleId);
      const res = await apiFetch<{ data: Quiz[]; meta: Meta }>(`/api/admin/quizzes?${params}`);
      setQuizzes(res.data || []);
      setMeta(res.meta || { page: 1, totalPages: 1, total: 0 });
    } catch {
      toast.error("Failed to load quizzes");
    }
  };

  const loadQuestions = async (quizId: string) => {
    setQLoading(true);
    try {
      const data = await apiFetch<Question[]>(`/api/admin/quizzes/${quizId}/questions`);
      setQuestions(data || []);
    } catch {
      toast.error("Failed to load questions");
      setQuestions([]);
    } finally {
      setQLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
    load(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    load(1, searchDebounce, filterModule);
  }, [searchDebounce, filterModule]);

  const createQuiz = async () => {
    if (!title.trim()) return toast.warning("Title is required");
    setLoading(true);
    try {
      const created = await apiFetch<Quiz>("/api/admin/quizzes", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description,
          module_id: formModuleId || undefined,
          status,
          duration_minutes: durationMinutes,
          pass_score: passScore,
          started_at: startedAt || null,
          ended_at: endedAt || null,
        }),
      });
      setTitle("");
      setDescription("");
      setFormModuleId("");
      setShowQuizForm(false);
      setStatus("draft");
      setDurationMinutes(30);
      setPassScore(70);
      setStartedAt("");
      setEndedAt("");
      await load(meta.page, searchDebounce, filterModule);
      if (created?._id) {
        setActiveQuizId(created._id);
        await loadQuestions(created._id);
        setTimeout(() => {
          const el = document.getElementById("question-bank");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
      toast.success("Quiz created. Lanjut tambah soal di Question Bank");
    } catch {
      toast.error("Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  const saveEditQuiz = async () => {
    if (!editing) return;
    setLoading(true);
    try {
      await apiFetch(`/api/admin/quizzes/${editing._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editing.title,
          description: editing.description,
          module_id: editing.module_id,
          status: (editing as any).status,
          duration_minutes: (editing as any).duration_minutes,
          pass_score: (editing as any).pass_score,
          started_at: (editing as any).started_at || null,
          ended_at: (editing as any).ended_at || null,
        }),
      });
      setEditing(null);
      await load(meta.page, searchDebounce, filterModule);
      toast.success("Quiz updated successfully");
    } catch {
      toast.error("Failed to update quiz");
    } finally {
      setLoading(false);
    }
  };

  const removeQuiz = async (id: string) => {
    if (!confirm("Delete this quiz and all questions?")) return;
    try {
      await apiFetch(`/api/admin/quizzes/${id}`, { method: "DELETE" });
      if (activeQuizId === id) {
        setActiveQuizId("");
        setQuestions([]);
      }
      await load(meta.page, searchDebounce, filterModule);
      toast.success("Quiz deleted");
    } catch {
      toast.error("Failed to delete quiz");
    }
  };


  const setQuizStatus = async (quiz: Quiz, nextStatus: "draft"|"published"|"active"|"archived") => {
    try {
      await apiFetch(`/api/admin/quizzes/${quiz._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await load(meta.page, searchDebounce, filterModule);
      toast.success(`Status quiz diubah ke ${nextStatus}`);
    } catch {
      toast.error("Gagal update status quiz");
    }
  };

  const createQuestion = async () => {
    if (!activeQuizId) return toast.warning("Select quiz first");
    if (!questionText.trim()) return toast.warning("Question text is required");
    if (questionType === "multiple_choice" && opts.some((o) => !o.trim())) return toast.warning("All options are required for multiple choice");

    try {
      await apiFetch(`/api/admin/quizzes/${activeQuizId}/questions`, {
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
      await loadQuestions(activeQuizId);
      await load(meta.page, searchDebounce, filterModule);
      toast.success("Question created");
    } catch {
      toast.error("Failed to create question");
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await apiFetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      await loadQuestions(activeQuizId);
      await load(meta.page, searchDebounce, filterModule);
      toast.success("Question deleted");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const deleteOption = async (id: string) => {
    if (!confirm("Delete this option?")) return;
    try {
      await apiFetch(`/api/admin/options/${id}`, { method: "DELETE" });
      await loadQuestions(activeQuizId);
      toast.success("Option deleted");
    } catch {
      toast.error("Failed to delete option");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Quizzes</h1>
            <p className="text-sm text-gray-500 mt-1">Manage quizzes, questions, and options</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quizzes..." className="input-base pl-10 w-48" style={{ paddingLeft: "2.3rem" }} />
            </div>
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="input-base w-44">
              <option value="">All Modules</option>
              {modules.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
            </select>
            <PrimaryButton onClick={() => { if (editing) { setEditing(null); setShowQuizForm(false); } else { setShowQuizForm((v) => !v); } }} icon={(editing || showQuizForm) ? "times" : "plus"}>{(editing || showQuizForm) ? "Cancel" : "Add Quiz"}</PrimaryButton>
          </div>
        </div>

        {(editing || showQuizForm) && (
          <div className="fixed inset-0 z-40 bg-black/50 flex items-start justify-center overflow-y-auto py-10 px-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-2xl p-6 space-y-5 relative">
              <button onClick={() => { setShowQuizForm(false); setEditing(null); }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><i className="fas fa-times" /></button>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-gray-900">{editing ? "Edit Quiz" : "Create New Quiz"}</h2>
                <p className="text-xs text-gray-500">Set pengaturan quiz. Setelah create akan dialihkan ke halaman detail untuk tambah soal.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600">Quiz title</label>
                <input className="input-base" placeholder="Contoh: Quiz Fiqh Dasar" value={editing ? editing.title : title} onChange={(e) => editing ? setEditing({ ...editing, title: e.target.value }) : setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600">Description</label>
                <textarea className="input-base" rows={3} placeholder="Ringkasan quiz" value={editing ? editing.description || "" : description} onChange={(e) => editing ? setEditing({ ...editing, description: e.target.value }) : setDescription(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">Module</label>
                  <select className="input-base" value={editing ? (editing.module_id || "") : formModuleId} onChange={(e) => editing ? setEditing({ ...editing, module_id: e.target.value }) : setFormModuleId(e.target.value)}>
                    <option value="">No Module</option>
                    {modules.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
                  </select>
                  <p className="text-[11px] text-gray-500">Quiz ditautkan ke modul ini.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">Status</label>
                  <select className="input-base" value={editing ? ((editing as any).status || "draft") : status} onChange={(e) => editing ? setEditing({ ...(editing as any), status: e.target.value } as any) : setStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                  <p className="text-[11px] text-gray-500">Active = bisa dikerjakan; Draft = belum tampil.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">Duration (minutes)</label>
                  <input className="input-base" type="number" min={1} max={300}
                    value={editing ? ((editing as any).duration_minutes || 30) : durationMinutes}
                    onChange={(e)=> editing ? setEditing({ ...(editing as any), duration_minutes: Number(e.target.value||30)} as any) : setDurationMinutes(Number(e.target.value||30))}
                  />
                  <p className="text-[11px] text-gray-500">Waktu pengerjaan per attempt.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">Pass score (%)</label>
                  <input className="input-base" type="number" min={1} max={100}
                    value={editing ? ((editing as any).pass_score || 70) : passScore}
                    onChange={(e)=> editing ? setEditing({ ...(editing as any), pass_score: Number(e.target.value||70)} as any) : setPassScore(Number(e.target.value||70))}
                  />
                  <p className="text-[11px] text-gray-500">Nilai kelulusan.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">Start at</label>
                  <input className="input-base" type="datetime-local"
                    value={editing ? ((editing as any).started_at ? new Date((editing as any).started_at).toISOString().slice(0,16) : "") : startedAt}
                    onChange={(e)=> editing ? setEditing({ ...(editing as any), started_at: e.target.value } as any) : setStartedAt(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">End at</label>
                  <input className="input-base" type="datetime-local"
                    value={editing ? ((editing as any).ended_at ? new Date((editing as any).ended_at).toISOString().slice(0,16) : "") : endedAt}
                    onChange={(e)=> editing ? setEditing({ ...(editing as any), ended_at: e.target.value } as any) : setEndedAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <PrimaryButton variant="secondary" onClick={() => { setShowQuizForm(false); setEditing(null); }}>Cancel</PrimaryButton>
                <PrimaryButton loading={loading} onClick={editing ? saveEditQuiz : createQuiz}>{editing ? "Update Quiz" : "Create Quiz"}</PrimaryButton>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Questions</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quizzes.length === 0 ? (
                <tr><td colSpan={4}><EmptyState icon="inbox" title="No quizzes found" description="Create first quiz" /></td></tr>
              ) : quizzes.map((q) => (
                <tr key={q._id} className={`${activeQuizId === q._id ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                  <td className="px-5 py-4">
                    <button className="text-left" onClick={() => { setActiveQuizId(q._id); loadQuestions(q._id); }}>
                      <div className="flex items-center gap-2"><p className="text-sm font-medium text-gray-900">{q.title}</p><Badge variant={q.status === "active" ? "success" : q.status === "published" ? "info" : q.status === "archived" ? "danger" : "neutral"} size="sm">{q.status || "draft"}</Badge></div>
                      <p className="text-xs text-gray-500">Click to manage questions</p>
                    </button>
                  </td>
                  <td className="hidden md:table-cell px-5 py-4 text-sm text-gray-600">{q.description || "-"}</td>
                  <td className="px-5 py-4"><Badge variant="success" size="sm">{q.questions_count || 0}</Badge></td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => setQuizStatus(q, "published")} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Publish</button>
                      <button onClick={() => setQuizStatus(q, "active")} className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Active</button>
                      <button onClick={() => setQuizStatus(q, "archived")} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Archive</button>
                      <a href={`/admin/quizzes/${q._id}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit & manage questions"><i className="fas fa-edit" /></a>
                      <button onClick={() => removeQuiz(q._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><i className="fas fa-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {quizzes.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
            <PrimaryButton variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1, searchDebounce, filterModule)}>Previous</PrimaryButton>
            <span className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages} ({meta.total})</span>
            <PrimaryButton variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => load(meta.page + 1, searchDebounce, filterModule)}>Next</PrimaryButton>
          </div>
        )}
      </div>

      
      {!activeQuiz && quizzes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Pilih salah satu quiz di tabel (klik judul) untuk mulai menambahkan soal & opsi.
        </div>
      )}
{activeQuiz && (
        <div id="question-bank" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold">Question Bank: {activeQuiz.title}</h2>
          </div>
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Question Text</label>
              <input className="input-base" placeholder="Contoh: Berapa rakaat shalat subuh?" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Question Type</label>
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Auto-check Answer Key (Essay)</label>
                <input className="input-base" placeholder="Jawaban kunci singkat" value={essayKey} onChange={(e) => setEssayKey(e.target.value)} disabled={questionType !== "essay"} />
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

          <div className="p-5 space-y-4">
            {qLoading ? <p className="text-sm text-gray-500">Loading questions...</p> : questions.length === 0 ? (
              <EmptyState icon="question-circle" title="No questions yet" description="Add your first question" />
            ) : questions.map((q) => (
              <div key={q._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start gap-3">
                  <div><p className="font-medium text-sm text-gray-900">{q.question_text}</p><p className="text-xs text-gray-500 mt-1">Type: {(q as any).question_type || "multiple_choice"} • Points: {(q as any).points || 10}</p></div>
                  <button onClick={() => deleteQuestion(q._id)} className="text-red-600 hover:text-red-700"><i className="fas fa-trash" /></button>
                </div>
                <ul className="mt-3 space-y-2">
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
