import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { Enrollment } from "@/lib/models/Enrollment";
import { requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    await connectDb();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const enrollKey = body.enrollKey ? String(body.enrollKey).trim() : "";

    const mod = await Module.findById(id);
    if (!mod || !mod.isActive) return fail("Module not found", 404);
    if (mod.enrollmentType === "manual") return fail("Enrollment is manual", 403);
    if (mod.enrollmentType === "enroll_key" && (!enrollKey || enrollKey !== mod.enrollKey)) return fail("Invalid enroll key", 403);

    const existing = await Enrollment.findOne({ moduleId: id, userId: auth.sub });
    if (existing) return ok(existing);

    const enrollment = await Enrollment.create({ moduleId: id, userId: auth.sub, enrolledBy: auth.sub, status: "active" });
    return ok(enrollment, 201);
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to enroll", 422, { error: String(e) });
  }
}
