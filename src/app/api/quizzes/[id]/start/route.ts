import { connectDb } from "@/lib/db";
import { Quiz } from "@/lib/models/Quiz";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    await connectDb();

    // Check if quiz exists
    const quiz = await Quiz.findById(id);
    if (!quiz) return fail("Quiz not found", 404);

    // Check if user is admin - admins cannot take quizzes
    if (auth.role === "admin") {
      return fail("Admin cannot take quizzes", 403);
    }

    if (quiz.status === "draft" || quiz.status === "archived") {
      return fail("Quiz belum tersedia", 403);
    }
    const now = new Date();
    if (quiz.started_at && new Date(quiz.started_at) > now) return fail("Quiz belum dimulai", 403);
    if (quiz.ended_at && new Date(quiz.ended_at) < now) return fail("Quiz sudah berakhir", 403);

    // Create new attempt
    const attempt = await QuizAttempt.create({
      user_id: auth.sub,
      quiz_id: id,
      started_at: new Date(),
    });

    return ok({
      attempt_id: attempt._id,
      quiz_id: id,
      started_at: attempt.started_at,
      duration_minutes: quiz.duration_minutes,
      pass_score: quiz.pass_score,
    });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to start quiz", 500, { error: String(e) });
  }
}
