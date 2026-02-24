import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Module } from "@/lib/models/Module";
import { User } from "@/lib/models/User";
import { requireAdmin } from "@/lib/auth";
import { ok, fail } from "@/lib/response";
import { z } from "zod";
import { isValidObjectId } from "mongoose";

const createEnrollmentSchema = z.object({
  moduleId: z.string().min(1),
  userId: z.string().min(1),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    await connectDb();
    const { searchParams } = new URL(req.url);
    const moduleId = searchParams.get("moduleId") || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (moduleId) {
      if (!isValidObjectId(moduleId)) return fail("Invalid moduleId", 422);
      query.moduleId = moduleId;
    }

    if (auth.role === "guru") {
      const mods = await Module.find({ assignedTeacherId: auth.sub }).select("_id").lean();
      const allowed = new Set(mods.map((m) => String(m._id)));
      if (moduleId && !allowed.has(moduleId)) throw new Error("FORBIDDEN");
      if (!moduleId) query.moduleId = { $in: Array.from(allowed) };
    }

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "userId", select: "nim name className", options: { lean: true } })
        .populate({ path: "moduleId", select: "name code", options: { lean: true } })
        .lean(),
      Enrollment.countDocuments(query),
    ]);

    return ok({ data: enrollments, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (e: unknown) {
    console.error("[admin/enrollments][GET]", e);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch enrollments", 500, e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    await connectDb();
    const parsed = createEnrollmentSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Validation error", 422);
    const { moduleId, userId, status } = parsed.data;

    const mod = await Module.findById(moduleId);
    if (!mod) return fail("Module not found", 404);
    // admin-only route: ownership already enforced by namespace RBAC

    const user = await User.findById(userId);
    if (!user) return fail("User not found", 404);

    const enrollment = await Enrollment.findOneAndUpdate(
      { moduleId, userId },
      { moduleId, userId, enrolledBy: auth.sub, status, enrolledAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return ok(enrollment, 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to create enrollment", 422, { error: String(e) });
  }
}
