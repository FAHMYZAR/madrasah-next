import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { requireAdminOrGuru } from "@/lib/auth";
import { ok, fail } from "@/lib/response";

export async function GET() {
  try {
    const auth = await requireAdminOrGuru();
    await connectDb();
    const query = auth.role === "guru" ? { assignedTeacherId: auth.sub } : {};
    const modules = await Module.find(query).sort({ createdAt: -1 });
    return ok(modules);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch modules", 500, { error: String(e) });
  }
}
