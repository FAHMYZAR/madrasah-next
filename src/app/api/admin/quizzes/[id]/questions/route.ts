import { connectDb } from "@/lib/db";
import { Question } from "@/lib/models/Question";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { Quiz } from "@/lib/models/Quiz";
import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

async function assertManagedQuiz(quizId: string) {
  const auth = await requireAdminOrGuru();
  await connectDb();
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) throw new Error("NOT_FOUND");
  if (auth.role === "guru" && String(quiz.created_by) !== auth.sub) throw new Error("FORBIDDEN");
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: quizId } = await params;
    await assertManagedQuiz(quizId);
    const body = await req.json();

    const questionText = String(body.question_text || "").trim();
    const points = Number(body.points || 10);
    const questionType = (body.question_type || "multiple_choice") as "multiple_choice" | "essay";
    const answerKeyText = String(body.answer_key_text || "").trim();

    if (!questionText) return fail("Question text is required", 422);
    if (points < 1 || points > 100) return fail("Points harus 1-100", 422);
    if (!["multiple_choice", "essay"].includes(questionType)) return fail("Question type invalid", 422);

    const question = await Question.create({
      quiz_id: quizId,
      question_text: questionText,
      question_type: questionType,
      points,
      answer_key_text: questionType === "essay" ? answerKeyText : "",
    });

    if (questionType === "multiple_choice") {
      if (!Array.isArray(body.options) || body.options.length < 2) return fail("Minimal 2 opsi", 422);

      const options = body.options
        .filter((opt: { option_text?: string }) => String(opt.option_text || "").trim().length > 0)
        .map((opt: { option_text: string; is_correct: boolean }) => ({
          question_id: String(question._id),
          option_text: String(opt.option_text).trim(),
          is_correct: !!opt.is_correct,
        }));

      if (options.length < 2) return fail("Minimal 2 opsi", 422);
      if (!options.some((o: { is_correct: boolean }) => o.is_correct)) return fail("Harus ada 1 jawaban benar", 422);
      await AnswerOption.insertMany(options);
    }

    const options = await AnswerOption.find({ question_id: String(question._id) });
    return ok({ ...question.toObject(), options }, 201);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Quiz not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to create question", 422, { error: String(e) });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: quizId } = await params;
    await assertManagedQuiz(quizId);

    const questions = await Question.find({ quiz_id: quizId }).lean();
    const questionsWithOptions = await Promise.all(
      questions.map(async (q) => {
        const options = await AnswerOption.find({ question_id: String(q._id) }).lean();
        return { ...q, options };
      })
    );

    return ok(questionsWithOptions);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Quiz not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch questions", 500, { error: String(e) });
  }
}
