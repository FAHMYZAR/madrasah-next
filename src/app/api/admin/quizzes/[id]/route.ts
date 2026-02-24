import { connectDb } from "@/lib/db";
import { Quiz } from "@/lib/models/Quiz";
import { Question } from "@/lib/models/Question";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { Module } from "@/lib/models/Module";
async function ensureQuizModuleAccess(modId: string, userId: string, role: string) {
  const mod = await Module.findById(modId);
  if (!mod) throw new Error("MODULE_NOT_FOUND");
  if (role === "guru" && String(mod.assignedTeacherId || mod.createdBy) !== userId) throw new Error("FORBIDDEN");
  return mod;
}


import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

async function managedQuiz(id: string) {
  const auth = await requireAdminOrGuru();
  await connectDb();
  const quiz = await Quiz.findById(id);
  if (!quiz) return { auth, quiz: null as any };
  if (auth.role === "guru" && String(quiz.created_by) !== auth.sub) throw new Error("FORBIDDEN");
  return { auth, quiz };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { quiz } = await managedQuiz(id);
    if (!quiz) return fail("Quiz not found", 404);

    const questions = await Question.find({ quiz_id: id }).lean();
    const questionsWithOptions = await Promise.all(
      questions.map(async (q) => {
        const options = await AnswerOption.find({ question_id: String(q._id) }).lean();
        return { ...q, options };
      })
    );

    return ok({ ...quiz.toObject(), questions: questionsWithOptions });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch quiz", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { auth, quiz } = await managedQuiz(id);
    if (!quiz) return fail("Quiz not found", 404);

    const body = await req.json();
    const patch: Record<string, unknown> = {
      title: body.title,
      description: body.description,
      module_id: body.module_id,
      status: body.status,
      duration_minutes: body.duration_minutes,
      pass_score: body.pass_score,
      started_at: body.started_at ? new Date(body.started_at) : body.started_at,
      ended_at: body.ended_at ? new Date(body.ended_at) : body.ended_at,
    };

    if (patch.module_id && auth.role === "guru") {
      const mod = await Module.findById(String(patch.module_id)).lean();
      if (!mod) return fail("Module not found", 404);
      if (String(mod.created_by) !== auth.sub) return fail("Guru hanya boleh pakai modul miliknya", 403);
    }

    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
    const updated = await Quiz.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return fail("Quiz not found", 404);
    return ok(updated);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to update quiz", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { quiz } = await managedQuiz(id);
    if (!quiz) return fail("Quiz not found", 404);

    const questions = await Question.find({ quiz_id: id }).select("_id").lean();
    const questionIds = questions.map((q) => String(q._id));

    await AnswerOption.deleteMany({ question_id: { $in: questionIds } });
    await Question.deleteMany({ quiz_id: id });

    await Quiz.findByIdAndDelete(id);
    return ok({ message: "Quiz deleted successfully" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to delete quiz", 422, { error: String(e) });
  }
}
