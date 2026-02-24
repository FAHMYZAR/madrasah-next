import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { Phase } from "@/lib/models/Phase";
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
    return ok(phase);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to fetch phase", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await ensurePhaseAccess(id, auth.sub, auth.role);
    const body = await req.json();
    const patch: Record<string, any> = {};
    if (body.title !== undefined) patch.title = String(body.title || "").trim();
    if (body.description !== undefined) patch.description = String(body.description || "").trim();
    if (body.order !== undefined) patch.order = Number(body.order);
    if (body.isPublished !== undefined) patch.isPublished = Boolean(body.isPublished);

    const updated = await Phase.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return fail("Phase not found", 404);
    return ok(updated);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to update phase", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await ensurePhaseAccess(id, auth.sub, auth.role);
    await Phase.findByIdAndDelete(id);
    return ok({ message: "Phase deleted" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to delete phase", 422, { error: String(e) });
  }
}
