import { requireAuth } from "@/lib/auth";
import { ensureModuleLearningAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { Quiz } from "@/lib/models/Quiz";
import { fail, ok } from "@/lib/response";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "user") return fail("Forbidden", 403);

    const { id } = await params;
    await connectDb();

    const quiz = await Quiz.findById(id);
    if (!quiz) return fail("Quiz not found", 404);
    await ensureModuleLearningAccess(String(quiz.module_id), auth);

    if (quiz.status === "draft" || quiz.status === "archived") return fail("Quiz belum tersedia", 403);
    const now = new Date();
    const startAt = (quiz as any).started_at ?? (quiz as any).start_at;
    const endAt = (quiz as any).ended_at ?? (quiz as any).end_at;
    if (startAt && new Date(startAt) > now) return fail("Quiz belum dimulai", 403);
    if (endAt && new Date(endAt) < now) return fail("Quiz sudah berakhir", 403);

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
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("ENROLLMENT_REQUIRED") || String(e).includes("FORBIDDEN")) return fail("Forbidden", 403);
    return fail("Failed to start quiz", 500, { error: String(e) });
  }
}
