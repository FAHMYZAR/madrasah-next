import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { Phase } from "@/lib/models/Phase";
import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

async function ensureModuleAccess(moduleId: string, userId: string, role: string) {
  await connectDb();
  const mod = await Module.findById(moduleId);
  if (!mod) throw new Error("NOT_FOUND");
  if (role === "guru" && String(mod.assignedTeacherId || mod.createdBy) !== userId) throw new Error("FORBIDDEN");
  return mod;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await ensureModuleAccess(id, auth.sub, auth.role);
    const phases = await Phase.find({ moduleId: id }).sort({ order: 1, createdAt: 1 });
    return ok(phases);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Module not found", 404);
    return fail("Failed to fetch phases", 500, { error: String(e) });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await ensureModuleAccess(id, auth.sub, auth.role);
    const body = await req.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const order = Number(body.order ?? 0);
    const isPublished = Boolean(body.isPublished ?? false);
    if (!title) return fail("Title is required", 422);
    const phase = await Phase.create({ moduleId: id, title, description, order, isPublished, createdBy: auth.sub });
    return ok(phase, 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Module not found", 404);
    return fail("Failed to create phase", 422, { error: String(e) });
  }
}
