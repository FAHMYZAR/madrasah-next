import { connectDb } from "@/lib/db";
import { Quiz } from "@/lib/models/Quiz";
import { Question } from "@/lib/models/Question";
import { Module } from "@/lib/models/Module";
async function ensureQuizModuleAccess(modId: string, userId: string, role: string) {
  const mod = await Module.findById(modId);
  if (!mod) throw new Error("MODULE_NOT_FOUND");
  if (role === "guru" && String(mod.assignedTeacherId || mod.createdBy) !== userId) throw new Error("FORBIDDEN");
  return mod;
}


import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrGuru();
    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const moduleId = searchParams.get("module_id");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (moduleId) query.module_id = moduleId;
    if (search) query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
    if (auth.role === "guru") query.created_by = auth.sub;

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
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, search, module_id: moduleId },
    });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch quizzes", 500, { error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdminOrGuru();
    const body = await req.json();
    await connectDb();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const module_id = body.module_id ? String(body.module_id) : undefined;
    const duration_minutes = Number(body.duration_minutes || 30);
    const pass_score = Number(body.pass_score || 70);
    const status = body.status || "draft";

    if (!title) return fail("Title is required", 422);
    if (duration_minutes < 1 || duration_minutes > 300) return fail("Duration harus 1-300 menit", 422);
    if (pass_score < 1 || pass_score > 100) return fail("Pass score harus 1-100", 422);

    if (module_id && actor.role === "guru") {
      const mod = await Module.findById(module_id).lean();
      if (!mod) return fail("Module not found", 404);
      if (String(mod.created_by) !== actor.sub) return fail("Guru hanya boleh pakai modul miliknya", 403);
    }

    const quiz = await Quiz.create({
      title,
      description,
      module_id: module_id || null,
      created_by: actor.sub,
      duration_minutes,
      pass_score,
      status,
      started_at: body.started_at ? new Date(body.started_at) : null,
      ended_at: body.ended_at ? new Date(body.ended_at) : null,
    });

    return ok(quiz, 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to create quiz", 422, { error: String(e) });
  }
}
