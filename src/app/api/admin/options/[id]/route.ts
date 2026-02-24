import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ensureQuestionAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { fail, ok } from "@/lib/response";

const patchOptionSchema = z.object({
  option_text: z.string().trim().min(1).optional(),
  is_correct: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await connectDb();

    const existing = await AnswerOption.findById(id);
    if (!existing) return fail("Option not found", 404);
    await ensureQuestionAccess(String(existing.question_id), auth);

    const body = await req.json();
    const parsed = patchOptionSchema.safeParse(body);
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const option = await AnswerOption.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!option) return fail("Option not found", 404);
    return ok(option);
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Option not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to update option", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    const { id } = await params;
    await connectDb();

    const existing = await AnswerOption.findById(id);
    if (!existing) return fail("Option not found", 404);
    await ensureQuestionAccess(String(existing.question_id), auth);

    await AnswerOption.findByIdAndDelete(id);
    return ok({ message: "Option deleted successfully" });
  } catch (e: unknown) {
    if (String(e).includes("NOT_FOUND")) return fail("Option not found", 404);
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to delete option", 422, { error: String(e) });
  }
}
