import { connectDb } from "@/lib/db";
import { requireAdminOrGuru } from "@/lib/auth";
import { UserAnswer } from "@/lib/models/UserAnswer";
import { Question } from "@/lib/models/Question";
import { Quiz } from "@/lib/models/Quiz";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { User } from "@/lib/models/User";
import { fail, ok } from "@/lib/response";

export async function GET() {
  try {
    const auth = await requireAdminOrGuru();
    await connectDb();

    const pending = await UserAnswer.find({ review_status: "pending" }).lean();
    if (pending.length === 0) return ok([]);

    const qIds = [...new Set(pending.map((p) => String(p.question_id)))];
    const attemptIds = [...new Set(pending.map((p) => String(p.attempt_id)))];

    const [questions, attempts] = await Promise.all([
      Question.find({ _id: { $in: qIds } }).lean(),
      QuizAttempt.find({ _id: { $in: attemptIds } }).lean(),
    ]);

    const quizIds = [...new Set(questions.map((q: any) => String(q.quiz_id)))];
    const userIds = [...new Set(attempts.map((a: any) => String(a.user_id)))];

    const [quizzes, users] = await Promise.all([
      Quiz.find({ _id: { $in: quizIds } }).lean(),
      User.find({ _id: { $in: userIds } }).select("name email").lean(),
    ]);

    const qMap = new Map(questions.map((q: any) => [String(q._id), q]));
    const aMap = new Map(attempts.map((a: any) => [String(a._id), a]));
    const quizMap = new Map(quizzes.map((q: any) => [String(q._id), q]));
    const userMap = new Map(users.map((u: any) => [String(u._id), u]));

    const data = pending
      .map((ans: any) => {
        const q = qMap.get(String(ans.question_id));
        if (!q) return null;
        const quiz = quizMap.get(String(q.quiz_id));
        if (!quiz) return null;
        if (auth.role === "guru" && String(quiz.created_by) !== auth.sub) return null;
        const attempt = aMap.get(String(ans.attempt_id));
        const user = attempt ? userMap.get(String(attempt.user_id)) : null;

        return {
          user_answer_id: ans._id,
          attempt_id: ans.attempt_id,
          quiz_id: quiz._id,
          quiz_title: quiz.title,
          question_id: q._id,
          question_text: q.question_text,
          points: q.points || 10,
          answer_text: ans.answer_text || "",
          student: user ? { id: user._id, name: user.name, email: user.email } : null,
        };
      })
      .filter(Boolean);

    return ok(data);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch pending grading", 500, { error: String(e) });
  }
}
