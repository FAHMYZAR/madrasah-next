import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ensureQuizAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { Question } from "@/lib/models/Question";
import { Quiz } from "@/lib/models/Quiz";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { UserAnswer } from "@/lib/models/UserAnswer";
import { fail, ok } from "@/lib/response";

const gradeSchema = z.object({ user_answer_id: z.string().min(1), awarded_points: z.number().min(0), is_correct: z.boolean() });

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    const body = await req.json();
    const parsed = gradeSchema.safeParse({ ...body, awarded_points: Number(body.awarded_points ?? 0) });
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    await connectDb();
    const ua = await UserAnswer.findById(parsed.data.user_answer_id);
    if (!ua) return fail("User answer not found", 404);

    const q = (await Question.findById(ua.question_id).lean()) as any;
    if (!q) return fail("Question not found", 404);
    const quiz = (await Quiz.findById(q.quiz_id).lean()) as any;
    if (!quiz) return fail("Quiz not found", 404);
    await ensureQuizAccess(String(quiz._id), auth);

    ua.awarded_points = Math.min(Number(q.points || 10), parsed.data.awarded_points);
    ua.is_correct = parsed.data.is_correct;
    ua.review_status = "manual_graded";
    await ua.save();

    const allAnswers = (await UserAnswer.find({ attempt_id: ua.attempt_id }).lean()) as any[];
    const qIds = allAnswers.map((a) => String(a.question_id));
    const questions = (await Question.find({ _id: { $in: qIds } }).lean()) as any[];
    const qMap = new Map(questions.map((qq) => [String(qq._id), qq]));

    let earned = 0;
    let total = 0;
    for (const a of allAnswers) {
      const qq = qMap.get(String(a.question_id));
      total += Number(qq?.points || 10);
      earned += Number(a.awarded_points || 0);
    }

    const score = total > 0 ? Math.round((earned / total) * 100) : 0;
    await QuizAttempt.findByIdAndUpdate(ua.attempt_id, { score });

    return ok({ message: "Manual grading saved", score });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to grade answer", 500, { error: String(e) });
  }
}
