import { connectDb } from "@/lib/db";
import { Quiz } from "@/lib/models/Quiz";
import { Question } from "@/lib/models/Question";
import { AnswerOption } from "@/lib/models/AnswerOption";
import { ok } from "@/lib/response";

export async function GET(req: Request) {
  await connectDb();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
  const moduleId = searchParams.get("module_id");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    status: { $in: ["published", "active"] },
  };
  if (moduleId) query.module_id = moduleId;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [quizzes, total] = await Promise.all([
    Quiz.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Quiz.countDocuments(query),
  ]);

  const quizzesWithCounts = await Promise.all(
    quizzes.map(async (q) => {
      const questionCount = await Question.countDocuments({ quiz_id: String(q._id) });
      return { ...q, questions_count: questionCount };
    })
  );

  return ok({
    data: quizzesWithCounts,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });
}
