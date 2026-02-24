"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client/api";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

type Module = { _id: string; name: string; code: string; description: string; assignedTeacherId?: string; visibility: "public" | "private"; enrollmentType: "manual" | "enroll_key" | "open"; enrollKey?: string | null; startDate?: string | null; endDate?: string | null; isActive: boolean };
type Phase = { _id: string; moduleId: string; title: string; description?: string; order: number; isPublished: boolean };
type Material = { _id: string; phaseId: string; type: "pdf" | "video" | "link"; title: string; url: string; description?: string; order: number; isVisible: boolean };
type Enrollment = { _id: string; moduleId: string; userId: string; status: string; enrolledAt: string };
type User = { _id: string; name: string; role: "admin" | "guru" | "user" };

const tabs = ["Phases", "Quizzes", "Enrollments", "Settings"] as const;

export default function ModuleDetailPage() {
  const toast = useToast();
  const params = useParams();
  const id = params?.id as string;
  const [module, setModule] = useState<Module | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [tab, setTab] = useState<typeof tabs[number]>("Phases");
  const [phases, setPhases] = useState<Phase[]>([]);
  const [materials, setMaterials] = useState<Record<string, Material[]>>({});
  const [phaseForm, setPhaseForm] = useState({ title: "", description: "", order: 0, isPublished: false });
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [materialForm, setMaterialForm] = useState({ phaseId: "", type: "pdf" as "pdf"|"video"|"link", title: "", url: "", description: "", order: 0, isVisible: true });
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [settings, setSettings] = useState<Partial<Module>>({});

  const loadModule = async () => {
    const mod = await apiFetch<Module>(`/api/admin/modules/${id}`);
    setModule(mod);
    setSettings({ ...mod });
  };
  const loadPhases = async () => {
    const res = await apiFetch<Phase[]>(`/api/modules/${id}/phases`);
    setPhases(res);
  };
  const loadMaterials = async (phaseId: string) => {
    const res = await apiFetch<Material[]>(`/api/phases/${phaseId}/materials`);
    setMaterials((prev) => ({ ...prev, [phaseId]: res }));
  };
  const loadTeachers = async () => {
    try {
      const res = await apiFetch<{ data: User[] }>("/api/admin/users?role=guru&limit=100");
      setTeachers(res.data.filter((u) => u.role === "guru"));
    } catch {}
  };
  const loadEnrollments = async () => {
    try {
      const res = await apiFetch<{ data: any[] }>(`/api/admin/enrollments?moduleId=${id}`);
      setEnrollments(res.data || []);
    } catch {}
  };

  useEffect(() => {
    if (!id) return;
    loadModule();
    loadPhases();
    loadTeachers();
    loadEnrollments();
  }, [id]);

  useEffect(() => {
    // load materials for all phases when phases change
    phases.forEach((p) => loadMaterials(p._id));
  }, [phases]);

  const createPhase = async () => {
    if (!phaseForm.title) return toast.warning("Phase title required");
    if (editingPhase) {
      await apiFetch(`/api/phases/${editingPhase._id}`, { method: "PATCH", body: JSON.stringify(phaseForm) });
      toast.success("Phase updated");
    } else {
      await apiFetch(`/api/modules/${id}/phases`, { method: "POST", body: JSON.stringify(phaseForm) });
      toast.success("Phase created");
    }
    setPhaseForm({ title: "", description: "", order: 0, isPublished: false });
    setEditingPhase(null);
    setShowPhaseModal(false);
    await loadPhases();
  };

  const deletePhase = async (phaseId: string) => {
    if (!confirm("Delete this phase?")) return;
    await apiFetch(`/api/phases/${phaseId}`, { method: "DELETE" });
    await loadPhases();
    toast.success("Phase deleted");
  };

  const createMaterial = async () => {
    if (!materialForm.phaseId || !materialForm.title || (!materialForm.url && !materialFile)) return toast.warning("Material fields required");
    const useFormData = materialFile !== null;
    const body: any = useFormData ? new FormData() : materialForm;
    if (useFormData) {
      body.append("title", materialForm.title);
      body.append("type", materialForm.type);
      body.append("url", materialForm.url || "");
      body.append("description", materialForm.description);
      body.append("order", String(materialForm.order));
      body.append("isVisible", String(materialForm.isVisible));
      if (materialFile) body.append("file", materialFile);
    }
    try {
      if (useFormData) {
        await apiFetch(`/api/phases/${materialForm.phaseId}/materials`, { method: "POST", body });
      } else {
        await apiFetch(`/api/phases/${materialForm.phaseId}/materials`, { method: "POST", body: JSON.stringify(materialForm) });
      }
      const pid = materialForm.phaseId;
      setMaterialForm({ phaseId: "", type: "pdf", title: "", url: "", description: "", order: 0, isVisible: true });
      setMaterialFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowMaterialModal(false);
      await loadMaterials(pid);
      toast.success("Material created");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create material");
    }
  };

  const saveSettings = async () => {
    if (!module) return;
    await apiFetch(`/api/admin/modules/${module._id}`, { method: "PATCH", body: JSON.stringify({ ...settings, assignedTeacherId: settings.assignedTeacherId || null, enrollKey: settings.enrollmentType === "enroll_key" ? settings.enrollKey : null }) });
    await loadModule();
    toast.success("Settings updated");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {!module ? (
        <EmptyState icon="book" title="Loading module" description="" />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{module.name}</h1>
              <p className="text-sm text-gray-500">Code: {module.code}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={module.isActive ? "success" : "neutral"}>{module.isActive ? "Active" : "Inactive"}</Badge>
              <Badge variant={module.visibility === "public" ? "info" : "neutral"}>{module.visibility}</Badge>
              <Badge variant="warning">{module.enrollmentType}</Badge>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex px-5 border-b border-gray-200 overflow-x-auto text-sm">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 border-b-2 ${tab === t ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500"}`}>{t}</button>
              ))}
            </div>
            <div className="p-5">
              {tab === "Phases" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <PrimaryButton onClick={() => { setEditingPhase(null); setPhaseForm({ title: "", description: "", order: 0, isPublished: false }); setShowPhaseModal(true); }} icon="plus">Add Phase</PrimaryButton>
                  </div>
                  {phases.length === 0 ? <EmptyState icon="list" title="No phases" description="Tambah phase/pertemuan" /> : (
                    <div className="space-y-3">
                      {phases.map((p) => (
                        <div key={p._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">{p.title}</p>
                                {p.isPublished && <Badge variant="success">Published</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">{p.description || "-"}</p>
                              <p className="text-xs text-gray-400">Order: {p.order}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingPhase(p); setPhaseForm({ title: p.title, description: p.description || "", order: p.order, isPublished: p.isPublished }); setShowPhaseModal(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit phase">
                                <i className="fas fa-edit" />
                              </button>
                              <button onClick={() => { setMaterialForm({ ...materialForm, phaseId: p._id }); setShowMaterialModal(true); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded" title="Add material">
                                <i className="fas fa-plus" />
                              </button>
                              <button onClick={() => deletePhase(p._id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete phase">
                                <i className="fas fa-trash" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                            {(materials[p._id] || []).length === 0 ? (
                              <p className="text-sm text-gray-500">No materials</p>
                            ) : (materials[p._id] || []).map((m) => (
                              <div key={m._id} className="flex justify-between items-center text-sm">
                                <div>
                                  <p className="font-medium text-gray-800">{m.title}</p>
                                  <p className="text-xs text-gray-500">{m.type} · {m.url}</p>
                                  {m.url && <a className="text-xs text-emerald-700 underline" href={m.url} target="_blank">Open</a>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={m.isVisible ? "success" : "neutral"}>{m.isVisible ? "Visible" : "Hidden"}</Badge>
                                  <button onClick={async () => { await apiFetch(`/api/materials/${m._id}`, { method: "DELETE" }); await loadMaterials(p._id); toast.success("Material deleted"); }} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                                    <i className="fas fa-trash" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "Quizzes" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Kelola quiz di menu Quizzes atau dari sini:</p>
                  <Link href={`/admin/quizzes?moduleId=${module._id}`} className="text-emerald-700 underline">Go to Quizzes</Link>
                </div>
              )}

              {tab === "Enrollments" && (
                <div className="space-y-3">
                  {enrollments.length === 0 ? <EmptyState icon="id-badge" title="No enrollments" description="" /> : (
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">User</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Enrolled At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {enrollments.map((en) => (
                          <tr key={en._id}>
                            <td className="px-3 py-2">{en.user?.name || en.userId}</td>
                            <td className="px-3 py-2">{en.status}</td>
                            <td className="px-3 py-2">{new Date(en.enrolledAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tab === "Settings" && module && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Name</label>
                      <input className="input-base" value={settings.name || ""} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Code</label>
                      <input className="input-base" value={settings.code || ""} onChange={(e) => setSettings({ ...settings, code: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Assign Teacher</label>
                      <select className="input-base" value={settings.assignedTeacherId || ""} onChange={(e) => setSettings({ ...settings, assignedTeacherId: e.target.value })}>
                        <option value="">-</option>
                        {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Visibility</label>
                      <select className="input-base" value={settings.visibility || "private"} onChange={(e) => setSettings({ ...settings, visibility: e.target.value as any })}>
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Enrollment Type</label>
                      <select className="input-base" value={settings.enrollmentType || "manual"} onChange={(e) => setSettings({ ...settings, enrollmentType: e.target.value as any })}>
                        <option value="manual">Manual</option>
                        <option value="enroll_key">Enroll Key</option>
                        <option value="open">Open</option>
                      </select>
                    </div>
                    {settings.enrollmentType === "enroll_key" && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Enroll Key</label>
                        <input className="input-base" value={settings.enrollKey || ""} onChange={(e) => setSettings({ ...settings, enrollKey: e.target.value })} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Start Date</label>
                      <input className="input-base" type="date" value={settings.startDate ? String(settings.startDate).slice(0,10) : ""} onChange={(e) => setSettings({ ...settings, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">End Date</label>
                      <input className="input-base" type="date" value={settings.endDate ? String(settings.endDate).slice(0,10) : ""} onChange={(e) => setSettings({ ...settings, endDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Description</label>
                    <textarea className="input-base" rows={3} value={settings.description || ""} onChange={(e) => setSettings({ ...settings, description: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="m-active-set" type="checkbox" checked={settings.isActive ?? false} onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })} />
                    <label htmlFor="m-active-set" className="text-sm text-gray-700">Active</label>
                  </div>
                  <div className="flex justify-end">
                    <PrimaryButton onClick={saveSettings}>Save Settings</PrimaryButton>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showPhaseModal && (
            <div className="fixed inset-0 z-40 bg-black/50 flex items-start justify-center overflow-y-auto py-10 px-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-xl p-6 space-y-4 relative">
                <button onClick={() => setShowPhaseModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><i className="fas fa-times" /></button>
                <h3 className="text-base font-semibold text-gray-900">{editingPhase ? "Edit Phase" : "Add Phase"}</h3>
                <input className="input-base" placeholder="Title" value={phaseForm.title} onChange={(e) => setPhaseForm({ ...phaseForm, title: e.target.value })} />
                <textarea className="input-base" rows={2} placeholder="Description" value={phaseForm.description} onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-base" type="number" placeholder="Order" value={phaseForm.order} onChange={(e) => setPhaseForm({ ...phaseForm, order: Number(e.target.value) })} />
                  <div className="flex items-center gap-2">
                    <input id="ph-pub" type="checkbox" checked={phaseForm.isPublished} onChange={(e) => setPhaseForm({ ...phaseForm, isPublished: e.target.checked })} />
                    <label htmlFor="ph-pub" className="text-sm text-gray-700">Published</label>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <PrimaryButton variant="secondary" onClick={() => { setShowPhaseModal(false); setEditingPhase(null); }}>Cancel</PrimaryButton>
                  <PrimaryButton onClick={createPhase}>{editingPhase ? "Update" : "Save"}</PrimaryButton>
                </div>
              </div>
            </div>
          )}

          {showMaterialModal && (
            <div className="fixed inset-0 z-40 bg-black/50 flex items-start justify-center overflow-y-auto py-10 px-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-xl p-6 space-y-4 relative">
                <button onClick={() => setShowMaterialModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><i className="fas fa-times" /></button>
                <h3 className="text-base font-semibold text-gray-900">Add Material</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600">Phase</label>
                  <select className="input-base" value={materialForm.phaseId} onChange={(e) => setMaterialForm({ ...materialForm, phaseId: e.target.value })}>
                    <option value="">Pilih phase</option>
                    {phases.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Type</label>
                    <select className="input-base" value={materialForm.type} onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value as any })}>
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                      <option value="link">Link</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Order</label>
                    <input className="input-base" type="number" value={materialForm.order} onChange={(e) => setMaterialForm({ ...materialForm, order: Number(e.target.value) })} />
                  </div>
                </div>
                <input className="input-base" placeholder="Title" value={materialForm.title} onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })} />
                {materialForm.type === "link" ? (
                  <input className="input-base" placeholder="URL" value={materialForm.url} onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })} />
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600">Upload {materialForm.type.toUpperCase()}</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-600 hover:border-emerald-400 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <i className="fas fa-cloud-upload-alt text-emerald-600 text-lg"></i>
                      <p className="mt-1">Drop file atau klik untuk pilih ({materialForm.type === "pdf" ? "PDF" : "Video"})</p>
                      <input ref={fileInputRef} className="hidden" type="file" accept={materialForm.type === "pdf" ? "application/pdf" : "video/*"} onChange={(e) => setMaterialFile(e.target.files?.[0] || null)} />
                      {materialFile && <p className="mt-1 text-xs text-gray-500">Selected: {materialFile.name}</p>}
                    </div>
                    <input className="input-base" placeholder="URL (opsional)" value={materialForm.url} onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })} />
                  </div>
                )}
                <textarea className="input-base" rows={2} placeholder="Description" value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} />
                <div className="flex items-center gap-2">
                  <input id="mat-vis" type="checkbox" checked={materialForm.isVisible} onChange={(e) => setMaterialForm({ ...materialForm, isVisible: e.target.checked })} />
                  <label htmlFor="mat-vis" className="text-sm text-gray-700">Visible</label>
                </div>
                <div className="flex justify-end gap-3">
                  <PrimaryButton variant="secondary" onClick={() => setShowMaterialModal(false)}>Cancel</PrimaryButton>
                  <PrimaryButton onClick={createMaterial}>Save</PrimaryButton>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
