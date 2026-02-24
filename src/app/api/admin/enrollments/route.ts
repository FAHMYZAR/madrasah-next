import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Module } from "@/lib/models/Module";
import { User } from "@/lib/models/User";
import { requireAdminOrGuru } from "@/lib/auth";
import { ok, fail } from "@/lib/response";

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrGuru();
    await connectDb();
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId") || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (moduleId) query.moduleId = moduleId;

    if (auth.role === "guru") {
      const mods = await Module.find(auth.role === "guru" ? { assignedTeacherId: auth.sub } : {} ).select("_id");
      const allowed = new Set(mods.map((m) => String(m._id)));
      if (moduleId && !allowed.has(moduleId)) throw new Error("FORBIDDEN");
      if (!moduleId) query.moduleId = { $in: Array.from(allowed) };
    }

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("userId", "nim name className").populate("moduleId", "name code"),
      Enrollment.countDocuments(query),
    ]);

    return ok({ data: enrollments, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch enrollments", 500, { error: String(e) });
  }
}
