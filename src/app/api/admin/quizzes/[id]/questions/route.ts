import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ensureQuizAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { Question } from "@/lib/models/Question";
import { fail, ok } from "@/lib/response";

const createQuestionSchema = z.object({
  question_text: z.string().trim().min(1),
  points: z.number().int().min(1).max(100).default(10),
  question_type: z.enum(["multiple_choice", "essay"]).default("multiple_choice"),
  answer_key_text: z.string().optional().default(""),
  options: z.array(z.object({ option_text: z.string().trim().min(1), is_correct: z.boolean().default(false) })).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id: quizId } = await params;
    await connectDb();
    await ensureQuizAccess(quizId, auth);

    const body = await req.json();
    const parsed = createQuestionSchema.safeParse({ ...body, points: Number(body.points ?? 10) });
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const question = await Question.create({
      quiz_id: quizId,
      question_text: parsed.data.question_text,
      type: parsed.data.question_type,
      points: parsed.data.points,
      answer_key_text: parsed.data.question_type === "essay" ? parsed.data.answer_key_text : "",
      manual_grading_required: parsed.data.question_type === "essay" && !String(parsed.data.answer_key_text || "").trim(),
    });

    if (parsed.data.question_type === "multiple_choice") {
      const options = parsed.data.options || [];
      if (options.length < 2) return fail("Validation failed", 422, "At least 2 options are required");
      if (!options.some((o) => o.is_correct)) return fail("Validation failed", 422, "At least 1 correct option is required");

      await AnswerOption.insertMany(
        options.map((opt) => ({
          question_id: String(question._id),
          option_text: opt.option_text,
          is_correct: !!opt.is_correct,
        }))
      );
    }

    const options = await AnswerOption.find({ question_id: String(question._id) }).lean();
    return ok({ ...question.toObject(), options }, 201);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Quiz not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to create question", 422, { error: String(e) });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id: quizId } = await params;
    await connectDb();
    await ensureQuizAccess(quizId, auth);

    const questions = await Question.find({ quiz_id: quizId }).lean();
    const questionsWithOptions = await Promise.all(
      questions.map(async (q) => ({ ...q, options: await AnswerOption.find({ question_id: String(q._id) }).lean() }))
    );

    return ok(questionsWithOptions);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Quiz not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch questions", 500, { error: String(e) });
  }
}
