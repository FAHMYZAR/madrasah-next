import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { Phase } from "@/lib/models/Phase";
import { Material } from "@/lib/models/Material";
import { saveUpload } from "@/lib/upload";
import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

async function ensureMaterialAccess(materialId: string, userId: string, role: string) {
  await connectDb();
  const material = await Material.findById(materialId);
  if (!material) throw new Error("NOT_FOUND");
  const phase = await Phase.findById(material.phaseId);
  if (!phase) throw new Error("NOT_FOUND");
  const mod = await Module.findById(phase.moduleId);
  if (!mod) throw new Error("NOT_FOUND");
  if (role === "guru" && String(mod.assignedTeacherId || mod.createdBy) !== userId) throw new Error("FORBIDDEN");
  return { material, phase, mod };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await ensureMaterialAccess(id, auth.sub, auth.role);
    const body = await req.json();
    const patch: Record<string, any> = {};
    if (body.title !== undefined) patch.title = String(body.title || "").trim();
    if (body.url !== undefined) patch.url = String(body.url || "").trim();
    if (body.type !== undefined) patch.type = body.type;
    if (body.description !== undefined) patch.description = String(body.description || "").trim();
    if (body.order !== undefined) patch.order = Number(body.order);
    if (body.isVisible !== undefined) patch.isVisible = Boolean(body.isVisible);

    const updated = await Material.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return fail("Material not found", 404);
    return ok(updated);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Material not found", 404);
    return fail("Failed to update material", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await ensureMaterialAccess(id, auth.sub, auth.role);
    await Material.findByIdAndDelete(id);
    return ok({ message: "Material deleted" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Material not found", 404);
    return fail("Failed to delete material", 422, { error: String(e) });
  }
}
