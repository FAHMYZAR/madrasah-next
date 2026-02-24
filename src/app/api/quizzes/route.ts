import { requireAuth } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Module } from "@/lib/models/Module";
import { Question } from "@/lib/models/Question";
import { Quiz } from "@/lib/models/Quiz";
import { ok, fail } from "@/lib/response";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const moduleId = searchParams.get("module_id");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const moduleQuery: Record<string, unknown> = { isActive: true };
    if (auth.role === "guru") moduleQuery.assignedTeacherId = auth.sub;
    if (auth.role === "user") {
      const enrollments = await Enrollment.find({ userId: auth.sub, status: "active" }).select("moduleId").lean();
      const enrolledIds = enrollments.map((e: any) => e.moduleId);
      moduleQuery.$or = [{ visibility: "public" }, { _id: { $in: enrolledIds } }];
    }
    if (moduleId) moduleQuery._id = moduleId;

    const allowedModules = await Module.find(moduleQuery).select("_id").lean();
    const allowedModuleIds = allowedModules.map((m: any) => String(m._id));

    const query: Record<string, unknown> = {
      status: { $in: ["published", "active"] },
      module_id: { $in: allowedModuleIds },
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [quizzes, total] = await Promise.all([
      Quiz.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Quiz.countDocuments(query),
    ]);

    const quizzesWithCounts = await Promise.all(
      quizzes.map(async (q) => {
        const questionCount = await Question.countDocuments({ quiz_id: String(q._id) });
        return { ...q, questions_count: questionCount };
      })
    );

    return ok({
      data: quizzesWithCounts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch quizzes", 500, { error: String(e) });
  }
}
