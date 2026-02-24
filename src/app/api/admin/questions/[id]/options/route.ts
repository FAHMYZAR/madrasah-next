import { connectDb } from "@/lib/db";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrGuru();
    const { id: questionId } = await params;
    const body = await req.json();
    await connectDb();

    if (!body.option_text) {
      return fail("Option text is required", 422);
    }

    const option = await AnswerOption.create({
      question_id: questionId,
      option_text: body.option_text,
      is_correct: body.is_correct || false,
    });

    return ok(option, 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to create option", 422, { error: String(e) });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrGuru();
    const { id: questionId } = await params;
    await connectDb();

    const options = await AnswerOption.find({ question_id: questionId }).lean();
    return ok(options);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to fetch options", 500, { error: String(e) });
  }
}
