import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ensureModuleAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { Question } from "@/lib/models/Question";
import { Quiz } from "@/lib/models/Quiz";
import { fail, ok } from "@/lib/response";

const createQuizSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional().default(""),
  module_id: z.string().min(1),
  duration_minutes: z.number().int().min(1).max(300).default(30),
  pass_score: z.number().int().min(1).max(100).default(70),
  status: z.enum(["draft", "published", "active", "archived"]).default("draft"),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
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

    if (auth.role === "guru") {
      const allowedModules = await Module.find({ assignedTeacherId: auth.sub }).select("_id").lean();
      query.module_id = { $in: allowedModules.map((m: any) => String(m._id)) };
    }

    const [quizzes, total] = await Promise.all([
      Quiz.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Quiz.countDocuments(query),
    ]);

    const quizzesWithCounts = await Promise.all(
      quizzes.map(async (q) => ({ ...q, questions_count: await Question.countDocuments({ quiz_id: String(q._id) }) }))
    );

    return ok({ data: quizzesWithCounts, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch quizzes", 500, { error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const body = await req.json();
    const parsed = createQuizSchema.safeParse({ ...body, duration_minutes: Number(body.duration_minutes ?? 30), pass_score: Number(body.pass_score ?? 70) });
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    await connectDb();
    await ensureModuleAccess(parsed.data.module_id, actor);

    const quiz = await Quiz.create({
      title: parsed.data.title,
      description: parsed.data.description,
      module_id: parsed.data.module_id,
      created_by: actor.sub,
      duration_minutes: parsed.data.duration_minutes,
      pass_score: parsed.data.pass_score,
      status: parsed.data.status,
      started_at: parsed.data.started_at ? new Date(parsed.data.started_at) : null,
      ended_at: parsed.data.ended_at ? new Date(parsed.data.ended_at) : null,
    });

    return ok(quiz.toObject(), 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Module not found", 404);
    return fail("Failed to create quiz", 422, { error: String(e) });
  }
}
