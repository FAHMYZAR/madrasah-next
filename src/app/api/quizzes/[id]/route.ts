import { requireAuth } from "@/lib/auth";
import { ensureModuleLearningAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { Question } from "@/lib/models/Question";
import { Quiz } from "@/lib/models/Quiz";
import { fail, ok } from "@/lib/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    await connectDb();

    const quiz = await Quiz.findById(id);
    if (!quiz) return fail("Quiz not found", 404);
    await ensureModuleLearningAccess(String(quiz.module_id), auth);

    const questions = await Question.find({ quiz_id: id }).lean();
    const questionsWithoutCorrectAnswer = await Promise.all(
      questions.map(async (q: any) => {
        const options = await AnswerOption.find({ question_id: String(q._id) })
          .select("option_text _id")
          .lean();
        return {
          _id: q._id,
          question_text: q.question_text,
          question_type: q.question_type || q.type || "multiple_choice",
          points: q.points || 10,
          options: (q.question_type || q.type) === "essay" ? [] : options.map((o) => ({ _id: o._id, option_text: o.option_text })),
        };
      })
    );

    return ok({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      module_id: quiz.module_id,
      duration_minutes: quiz.duration_minutes,
      pass_score: quiz.pass_score,
      status: quiz.status,
      started_at: (quiz as any).started_at ?? (quiz as any).start_at,
      ended_at: (quiz as any).ended_at ?? (quiz as any).end_at,
      questions: questionsWithoutCorrectAnswer,
    });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("ENROLLMENT_REQUIRED") || String(e).includes("FORBIDDEN")) return fail("Forbidden", 403);
    return fail("Failed to fetch quiz", 500, { error: String(e) });
  }
}
