import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ensureQuestionAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { fail, ok } from "@/lib/response";

const createOptionSchema = z.object({
  option_text: z.string().trim().min(1),
  is_correct: z.boolean().optional().default(false),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id: questionId } = await params;
    await connectDb();
    await ensureQuestionAccess(questionId, auth);

    const body = await req.json();
    const parsed = createOptionSchema.safeParse(body);
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const option = await AnswerOption.create({
      question_id: questionId,
      option_text: parsed.data.option_text,
      is_correct: parsed.data.is_correct,
    });

    return ok(option, 201);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Question not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to create option", 422, { error: String(e) });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id: questionId } = await params;
    await connectDb();
    await ensureQuestionAccess(questionId, auth);

    const options = await AnswerOption.find({ question_id: questionId }).lean();
    return ok(options);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Question not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch options", 500, { error: String(e) });
  }
}
