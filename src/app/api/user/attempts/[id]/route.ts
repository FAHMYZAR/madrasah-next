import { connectDb } from "@/lib/db";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { UserAnswer } from "@/lib/models/UserAnswer";
import { Question } from "@/lib/models/Question";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    await connectDb();

    const attempt = await QuizAttempt.findOne({ _id: id, user_id: auth.sub }).lean();
    if (!attempt) return fail("Attempt not found", 404);

    const answers = await UserAnswer.find({ attempt_id: id }).lean();
    const qIds = answers.map((a) => a.question_id);
    const questions = await Question.find({ _id: { $in: qIds } }).lean();
    const options = await AnswerOption.find({ question_id: { $in: qIds } }).lean();

    const qMap = new Map(questions.map((q) => [String(q._id), q]));
    const optionsByQ = new Map<string, typeof options>();
    for (const o of options) {
      const key = String(o.question_id);
      if (!optionsByQ.has(key)) optionsByQ.set(key, [] as any);
      optionsByQ.get(key)!.push(o);
    }

    const detail = answers.map((a) => {
      const q = qMap.get(String(a.question_id));
      const opts = optionsByQ.get(String(a.question_id)) || [];
      return {
        question_id: a.question_id,
        question_text: q?.question_text || "",
        points: (q as any)?.points || 10,
        selected_option_id: a.selected_option_id,
        is_correct: a.is_correct,
        options: opts.map((o) => ({ _id: o._id, option_text: o.option_text, is_correct: o.is_correct })),
      };
    });

    return ok({ attempt, answers: detail });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch attempt detail", 500, { error: String(e) });
  }
}
