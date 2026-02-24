import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { requireAuth } from "@/lib/auth";
import { ok, fail } from "@/lib/response";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.role !== "guru") return fail("Forbidden", 403);

    await connectDb();
    const modules = await Module.find({ assignedTeacherId: auth.sub }).sort({ createdAt: -1 });
    return ok(modules);
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch modules", 500, { error: String(e) });
  }
}
