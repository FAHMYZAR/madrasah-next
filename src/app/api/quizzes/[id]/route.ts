import { connectDb } from "@/lib/db";
import { Quiz } from "@/lib/models/Quiz";
import { Question } from "@/lib/models/Question";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { fail, ok } from "@/lib/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDb();

    const quiz = await Quiz.findById(id);
    if (!quiz) return fail("Quiz not found", 404);

    const questions = await Question.find({ quiz_id: id }).lean();
    
    // Don't expose is_correct to users
    const questionsWithoutCorrectAnswer = await Promise.all(
      questions.map(async (q) => {
        const options = await AnswerOption.find({ question_id: String(q._id) })
          .select("option_text _id")
          .lean();
        return { 
          _id: q._id,
          question_text: q.question_text,
          question_type: (q as any).question_type || "multiple_choice",
          points: (q as any).points || 10,
          options: ((q as any).question_type === "essay") ? [] : options.map((o) => ({ _id: o._id, option_text: o.option_text })) 
        };
      })
    );

    return ok({ 
      _id: quiz._id, 
      title: quiz.title, 
      description: quiz.description,
      module_id: quiz.module_id,
      duration_minutes: quiz.duration_minutes,
      pass_score: quiz.pass_score,
      status: quiz.status,
      started_at: quiz.started_at,
      ended_at: quiz.ended_at,
      questions: questionsWithoutCorrectAnswer 
    });
  } catch (e: unknown) {
    return fail("Failed to fetch quiz", 500, { error: String(e) });
  }
}
