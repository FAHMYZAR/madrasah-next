import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ensureModuleAccess, ensureQuizAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { Question } from "@/lib/models/Question";
import { Quiz } from "@/lib/models/Quiz";
import { fail, ok } from "@/lib/response";

const patchQuizSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  module_id: z.string().min(1).optional(),
  status: z.enum(["draft", "published", "active", "archived"]).optional(),
  duration_minutes: z.number().int().min(1).max(300).optional(),
  pass_score: z.number().int().min(1).max(100).optional(),
  started_at: z.string().nullable().optional(),
  ended_at: z.string().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await connectDb();

    const quiz = await ensureQuizAccess(id, auth);
    const questions = await Question.find({ quiz_id: id }).lean();
    const questionsWithOptions = await Promise.all(
      questions.map(async (q) => ({ ...q, options: await AnswerOption.find({ question_id: String(q._id) }).lean() }))
    );

    return ok({ ...quiz.toObject(), questions: questionsWithOptions });
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Quiz not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch quiz", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await connectDb();

    await ensureQuizAccess(id, auth);
    const body = await req.json();
    const parsed = patchQuizSchema.safeParse({
      ...body,
      duration_minutes: body.duration_minutes !== undefined ? Number(body.duration_minutes) : undefined,
      pass_score: body.pass_score !== undefined ? Number(body.pass_score) : undefined,
    });
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    if (parsed.data.module_id) await ensureModuleAccess(parsed.data.module_id, auth);

    const patch: Record<string, unknown> = { ...parsed.data };
    if (patch.started_at) patch.started_at = new Date(String(patch.started_at));
    if (patch.ended_at) patch.ended_at = new Date(String(patch.ended_at));

    const updated = await Quiz.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!updated) return fail("Quiz not found", 404);
    return ok(updated);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Quiz not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to update quiz", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await connectDb();
    await ensureQuizAccess(id, auth);

    const questions = await Question.find({ quiz_id: id }).select("_id").lean();
    const questionIds = questions.map((q) => String(q._id));
    await AnswerOption.deleteMany({ question_id: { $in: questionIds } });
    await Question.deleteMany({ quiz_id: id });
    await Quiz.findByIdAndDelete(id);

    return ok({ message: "Quiz deleted successfully" });
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Quiz not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to delete quiz", 422, { error: String(e) });
  }
}
