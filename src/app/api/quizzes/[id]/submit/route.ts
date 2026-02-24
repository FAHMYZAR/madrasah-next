import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { ensureModuleLearningAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { Question } from "@/lib/models/Question";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { Quiz } from "@/lib/models/Quiz";
import { UserAnswer } from "@/lib/models/UserAnswer";
import { fail, ok } from "@/lib/response";

const submitSchema = z.object({
  attempt_id: z.string().min(1),
  answers: z.array(z.object({
    question_id: z.string().min(1),
    selected_option_id: z.string().optional(),
    answer_text: z.string().optional(),
  })).min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "user") return fail("Forbidden", 403);

    const parsed = submitSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const { id } = await params;
    const { attempt_id, answers } = parsed.data;
    await connectDb();

    const quiz = await Quiz.findById(id).lean();
    if (!quiz) return fail("Quiz not found", 404);
    await ensureModuleLearningAccess(String((quiz as any).module_id), auth);

    const attempt = await QuizAttempt.findOne({ _id: attempt_id, user_id: auth.sub, quiz_id: id });
    if (!attempt) return fail("Invalid attempt", 404);
    if (attempt.submitted_at) return fail("Attempt already submitted", 409);

    const now = new Date();
    const started = new Date(attempt.started_at);
    const deadline = new Date(started.getTime() + Number((quiz as any).duration_minutes || 30) * 60 * 1000);
    if (now > deadline) return fail("Waktu quiz habis", 408);

    const questionIds = answers.map((a) => a.question_id);
    const questions = await Question.find({ _id: { $in: questionIds } }).lean();
    const qMap = new Map(questions.map((q: any) => [String(q._id), q]));

    const correctOptions = await AnswerOption.find({ question_id: { $in: questionIds }, is_correct: true }).lean();
    const correctMap = new Map(correctOptions.map((o: any) => [String(o.question_id), String(o._id)]));

    let correctCount = 0;
    let earnedPoints = 0;
    let totalPoints = 0;
    let pendingManualCount = 0;
    const userAnswers: Record<string, unknown>[] = [];

    for (const answer of answers) {
      const q = qMap.get(String(answer.question_id)) as any;
      if (!q) continue;
      const pts = Number(q.points || 10);
      totalPoints += pts;

      const isEssay = (q.question_type || q.type || "multiple_choice") === "essay";
      let isCorrect = false;
      let selectedOptionId = "";
      let awardedPoints = 0;
      let reviewStatus: "pending" | "auto_graded" | "manual_graded" = "auto_graded";
      let answerText = "";

      if (isEssay) {
        const key = String(q.answer_key_text || "").trim().toLowerCase();
        const val = String(answer.answer_text || "").trim();
        answerText = val;
        if (!key) {
          reviewStatus = "pending";
          pendingManualCount++;
        } else {
          isCorrect = key === val.toLowerCase();
          if (isCorrect) awardedPoints = pts;
        }
      } else {
        const correctOptionId = correctMap.get(String(answer.question_id));
        selectedOptionId = String(answer.selected_option_id || "");
        isCorrect = correctOptionId === selectedOptionId;
        if (isCorrect) awardedPoints = pts;
      }

      if (isCorrect) correctCount++;
      earnedPoints += awardedPoints;

      userAnswers.push({
        attempt_id: String(attempt_id),
        question_id: String(answer.question_id),
        selected_option_id: selectedOptionId,
        answer_text: answerText,
        is_correct: isCorrect,
        awarded_points: awardedPoints,
        review_status: reviewStatus,
      });
    }

    await UserAnswer.insertMany(userAnswers);

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    await QuizAttempt.findByIdAndUpdate(attempt_id, { score, submitted_at: new Date() });

    return ok({
      attempt_id: String(attempt_id),
      score,
      correct_count: correctCount,
      total_questions: questions.length,
      earned_points: earnedPoints,
      total_points: totalPoints,
      pending_manual_review: pendingManualCount,
      pass_score: Number((quiz as any).pass_score || 70),
      passed: score >= Number((quiz as any).pass_score || 70),
    });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("ENROLLMENT_REQUIRED") || String(e).includes("FORBIDDEN")) return fail("Forbidden", 403);
    return fail("Failed to submit quiz", 500, { error: String(e) });
  }
}
