import { connectDb } from "@/lib/db";
import { requireAdminOrGuru } from "@/lib/auth";
import { UserAnswer } from "@/lib/models/UserAnswer";
import { Question } from "@/lib/models/Question";
import { Quiz } from "@/lib/models/Quiz";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { fail, ok } from "@/lib/response";

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrGuru();
    const body = await req.json();
    const user_answer_id = String(body.user_answer_id || "");
    const awarded_points = Number(body.awarded_points ?? 0);
    const is_correct = !!body.is_correct;

    if (!user_answer_id) return fail("user_answer_id is required", 422);
    if (awarded_points < 0) return fail("awarded_points invalid", 422);

    await connectDb();
    const ua = await UserAnswer.findById(user_answer_id);
    if (!ua) return fail("User answer not found", 404);

    const q = await Question.findById(ua.question_id).lean() as any;
    if (!q) return fail("Question not found", 404);
    const quiz = await Quiz.findById(q.quiz_id).lean() as any;
    if (!quiz) return fail("Quiz not found", 404);
    if (auth.role === "guru" && String(quiz.created_by) !== auth.sub) return fail("Unauthorized", 401);

    const maxPts = Number(q.points || 10);
    const pts = Math.min(maxPts, awarded_points);

    ua.awarded_points = pts;
    ua.is_correct = is_correct;
    ua.review_status = "manual_graded";
    await ua.save();

    // recompute attempt score
    const allAnswers = await UserAnswer.find({ attempt_id: ua.attempt_id }).lean() as any[];
    const qIds = allAnswers.map((a) => String(a.question_id));
    const questions = await Question.find({ _id: { $in: qIds } }).lean() as any[];
    const qMap = new Map(questions.map((qq) => [String(qq._id), qq]));

    let earned = 0;
    let total = 0;
    for (const a of allAnswers) {
      const qq = qMap.get(String(a.question_id));
      const p = Number(qq?.points || 10);
      total += p;
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
