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
    const data = await Promise.all(
      questions.map(async (q) => {
        const options = await AnswerOption.find({ question_id: String(q._id) })
          .select("_id option_text")
          .lean();
        return {
          _id: q._id,
          question_text: q.question_text,
          options,
        };
      })
    );

    return ok(data);
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("ENROLLMENT_REQUIRED") || String(e).includes("FORBIDDEN")) return fail("Forbidden", 403);
    return fail("Failed to fetch quiz questions", 500, { error: String(e) });
  }
}
