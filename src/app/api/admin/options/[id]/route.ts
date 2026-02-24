import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrGuru();
    const { id } = await params;
    const body = await req.json();
    await connectDb();

    const option = await AnswerOption.findByIdAndUpdate(
      id,
      { option_text: body.option_text, is_correct: body.is_correct },
      { new: true }
    );

    if (!option) return fail("Option not found", 404);
    return ok(option);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to update option", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrGuru();
    const { id } = await params;
    await connectDb();

    const option = await AnswerOption.findByIdAndDelete(id);
    if (!option) return fail("Option not found", 404);

    return ok({ message: "Option deleted successfully" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to delete option", 422, { error: String(e) });
  }
}
