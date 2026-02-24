import { connectDb } from "@/lib/db";
import { Question } from "@/lib/models/Question";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrGuru();
    const { id } = await params;
    await connectDb();

    const question = await Question.findById(id);
    if (!question) return fail("Question not found", 404);

    const options = await AnswerOption.find({ question_id: id }).lean();
    return ok({ ...question.toObject(), options });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to fetch question", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrGuru();
    const { id } = await params;
    const body = await req.json();
    await connectDb();

    const patch: Record<string, unknown> = {};
    if (body.question_text !== undefined) patch.question_text = String(body.question_text || "").trim();
    if (body.question_type !== undefined) {
      if (!["multiple_choice", "essay"].includes(String(body.question_type))) return fail("Question type invalid", 422);
      patch.question_type = body.question_type;
    }
    if (body.answer_key_text !== undefined) patch.answer_key_text = String(body.answer_key_text || "").trim();
    if (body.points !== undefined) {
      const p = Number(body.points);
      if (Number.isNaN(p) || p < 1 || p > 100) return fail("Points harus 1-100", 422);
      patch.points = p;
    }

    const question = await Question.findByIdAndUpdate(id, patch, { new: true });
    if (!question) return fail("Question not found", 404);
    return ok(question);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to update question", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrGuru();
    const { id } = await params;
    await connectDb();

    await AnswerOption.deleteMany({ question_id: id });
    const question = await Question.findByIdAndDelete(id);
    if (!question) return fail("Question not found", 404);

    return ok({ message: "Question deleted successfully" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to delete question", 422, { error: String(e) });
  }
}
