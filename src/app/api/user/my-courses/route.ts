import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Module } from "@/lib/models/Module";
import { requireAuth } from "@/lib/auth";
import { ok, fail } from "@/lib/response";

export async function GET() {
  try {
    const auth = await requireAuth();
    await connectDb();
    const enrollments = await Enrollment.find({ userId: auth.sub, status: "active" });
    const moduleIds = enrollments.map((e) => e.moduleId);
    const modules = await Module.find({ _id: { $in: moduleIds } });
    const map = new Map(modules.map((m) => [String(m._id), m]));
    const data = enrollments.map((en) => ({
      enrollment: en,
      module: map.get(String(en.moduleId)),
    }));
    return ok(data);
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch courses", 500, { error: String(e) });
  }
}
