import { requireAuth } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Module } from "@/lib/models/Module";
import { ok, fail } from "@/lib/response";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { isActive: true };

    if (auth.role === "guru") {
      query.assignedTeacherId = auth.sub;
    } else if (auth.role === "user") {
      const enrollments = await Enrollment.find({ userId: auth.sub, status: "active" }).select("moduleId").lean();
      const enrolledIds = enrollments.map((e: any) => e.moduleId);
      query.$or = [{ visibility: "public" }, { _id: { $in: enrolledIds } }];
    }

    const [modules, total] = await Promise.all([
      Module.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Module.countDocuments(query),
    ]);

    return ok({
      data: modules,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch modules", 500, { error: String(e) });
  }
}
