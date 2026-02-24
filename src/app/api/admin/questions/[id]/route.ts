import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ensureQuestionAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { Question } from "@/lib/models/Question";
import { fail, ok } from "@/lib/response";

const patchQuestionSchema = z.object({
  question_text: z.string().trim().min(1).optional(),
  question_type: z.enum(["multiple_choice", "essay"]).optional(),
  answer_key_text: z.string().optional(),
  points: z.number().int().min(1).max(100).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await connectDb();
    await ensureQuestionAccess(id, auth);

    const question = await Question.findById(id);
    if (!question) return fail("Question not found", 404);
    const options = await AnswerOption.find({ question_id: id }).lean();
    return ok({ ...question.toObject(), options });
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Question not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch question", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await connectDb();
    await ensureQuestionAccess(id, auth);

    const body = await req.json();
    const parsed = patchQuestionSchema.safeParse({ ...body, points: body.points !== undefined ? Number(body.points) : undefined });
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const question = await Question.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!question) return fail("Question not found", 404);
    return ok(question);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Question not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to update question", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await connectDb();
    await ensureQuestionAccess(id, auth);

    await AnswerOption.deleteMany({ question_id: id });
    const question = await Question.findByIdAndDelete(id);
    if (!question) return fail("Question not found", 404);

    return ok({ message: "Question deleted successfully" });
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Question not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to delete question", 422, { error: String(e) });
  }
}
