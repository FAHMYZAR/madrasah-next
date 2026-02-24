import { connectDb } from "@/lib/db";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { Quiz } from "@/lib/models/Quiz";
import { requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      QuizAttempt.find({ user_id: auth.sub, submitted_at: { $ne: null } })
        .sort({ submitted_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QuizAttempt.countDocuments({ user_id: auth.sub, submitted_at: { $ne: null } }),
    ]);

    // Get quiz titles
    const quizIds = [...new Set(attempts.map((a) => String(a.quiz_id)))];
    const quizzes = await Quiz.find({ _id: { $in: quizIds } }).lean();
    const quizzesMap = new Map(quizzes.map((q) => [String(q._id), q.title]));

    const attemptsWithTitles = attempts.map((a) => ({
      ...a,
      quiz_title: quizzesMap.get(String(a.quiz_id)) || "Unknown Quiz",
    }));

    return ok({
      data: attemptsWithTitles,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to fetch attempts", 500, { error: String(e) });
  }
}
