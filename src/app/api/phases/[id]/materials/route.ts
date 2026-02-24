import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { Phase } from "@/lib/models/Phase";
import { Material } from "@/lib/models/Material";
import { saveUpload } from "@/lib/upload";
import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

async function ensurePhaseAccess(phaseId: string, userId: string, role: string) {
  await connectDb();
  const phase = await Phase.findById(phaseId);
  if (!phase) throw new Error("NOT_FOUND");
  const mod = await Module.findById(phase.moduleId);
  if (!mod) throw new Error("NOT_FOUND");
  if (role === "guru" && String(mod.assignedTeacherId || mod.createdBy) !== userId) throw new Error("FORBIDDEN");
  return { phase, mod };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    const { phase } = await ensurePhaseAccess(id, auth.sub, auth.role);
    const materials = await Material.find({ phaseId: phase._id }).sort({ order: 1, createdAt: 1 });
    return ok(materials);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to fetch materials", 500, { error: String(e) });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    const { phase } = await ensurePhaseAccess(id, auth.sub, auth.role);
    const ct = req.headers.get("content-type") || "";
    let payload: Record<string, any> = { phaseId: phase._id, createdBy: auth.sub };

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      payload.title = String(form.get("title") || "").trim();
      payload.type = String(form.get("type") || "");
      payload.url = String(form.get("url") || "").trim();
      payload.description = String(form.get("description") || "").trim();
      payload.order = Number(form.get("order") ?? 0);
      payload.isVisible = String(form.get("isVisible") || "true") === "true";
      const file = form.get("file") || form.get("upload") || form.get("media");
      if (file instanceof File && file.size > 0) {
        const saved = await saveUpload(file, "materials");
        payload.url = saved;
      }
    } else {
      const body = await req.json();
      payload.title = String(body.title || "").trim();
      payload.type = body.type;
      payload.url = String(body.url || "").trim();
      payload.description = String(body.description || "").trim();
      payload.order = Number(body.order ?? 0);
      payload.isVisible = Boolean(body.isVisible ?? true);
    }

    if (!payload.title || !payload.url || !["pdf", "video", "link"].includes(payload.type)) return fail("Title, url, and valid type are required", 422);
    const material = await Material.create(payload);
    return ok(material, 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to create material", 422, { error: String(e) });
  }
}
