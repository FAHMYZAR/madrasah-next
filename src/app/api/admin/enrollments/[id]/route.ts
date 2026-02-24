import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Module } from "@/lib/models/Module";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/response";
import { z } from "zod";

const patchEnrollmentSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  enrolledAt: z.string().datetime().optional().nullable(),
});

async function ensureAccess(enrollmentId: string, userId: string, role: string) {
  await connectDb();
  const en = await Enrollment.findById(enrollmentId).lean();
  if (!en) throw new Error("NOT_FOUND");
  if (role === "guru") {
    const mod = await Module.findById(en.moduleId);
    if (!mod || String(mod.assignedTeacherId) !== userId) throw new Error("FORBIDDEN");
  }
  return en;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await ensureAccess(id, auth.sub, auth.role);
    const parsed = patchEnrollmentSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Validation error", 422);
    const patch: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) patch.status = parsed.data.status;
    if (parsed.data.enrolledAt !== undefined) patch.enrolledAt = parsed.data.enrolledAt ? new Date(parsed.data.enrolledAt) : new Date();

    const updated = await Enrollment.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!updated) return fail("Enrollment not found", 404);
    return ok(updated);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Enrollment not found", 404);
    return fail("Failed to update enrollment", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await ensureAccess(id, auth.sub, auth.role);
    const deleted = await Enrollment.findByIdAndDelete(id);
    if (!deleted) return fail("Enrollment not found", 404);
    return ok({ message: "Enrollment deleted" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Enrollment not found", 404);
    return fail("Failed to delete enrollment", 422, { error: String(e) });
  }
}
