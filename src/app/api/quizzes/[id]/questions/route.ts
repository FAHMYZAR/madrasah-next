import { connectDb } from "@/lib/db";
import { Question } from "@/lib/models/Question";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { fail, ok } from "@/lib/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDb();

    const questions = await Question.find({ quiz_id: id }).lean();
    const data = await Promise.all(
      questions.map(async (q) => {
        const options = await AnswerOption.find({ question_id: String(q._id) })
          .select("_id option_text")
          .lean();
        return {
          _id: q._id,
          question_text: q.question_text,
          options,
        };
      })
    );

    return ok(data);
  } catch (e: unknown) {
    return fail("Failed to fetch quiz questions", 500, { error: String(e) });
  }
}
