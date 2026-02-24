import { requireAuth } from "@/lib/auth";
import { ensureModuleAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Module } from "@/lib/models/Module";
import { Quiz } from "@/lib/models/Quiz";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { fail, ok } from "@/lib/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id: moduleId } = await params;

    if (auth.role === "user") return fail("Forbidden", 403);

    await connectDb();

    const mod = await Module.findById(moduleId).lean();
    if (!mod) return fail("Module not found", 404);

    if (auth.role === "guru") {
      await ensureModuleAccess(moduleId, auth);
    }

    const [totalStudents, quizzes] = await Promise.all([
      Enrollment.countDocuments({ moduleId, status: "active" }),
      Quiz.find({ module_id: moduleId }).select("_id").lean(),
    ]);

    const quizIds = quizzes.map((q: any) => String(q._id));
    const quizzesCount = quizIds.length;

    if (quizzesCount === 0) {
      return ok({
        totalStudents,
        totalAttempts: 0,
        averageScore: 0,
        passed: 0,
        failed: 0,
        quizzesCount,
      });
    }

    const [recap] = await QuizAttempt.aggregate([
      {
        $match: {
          quiz_id: { $in: quizIds },
          $or: [{ status: { $in: ["submitted", "graded"] } }, { submitted_at: { $ne: null } }],
        },
      },
      {
        $addFields: {
          quizObjectId: { $toObjectId: "$quiz_id" },
          scoreValue: { $ifNull: ["$total_score", { $ifNull: ["$score", 0] }] },
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "quizObjectId",
          foreignField: "_id",
          as: "quiz",
        },
      },
      { $unwind: "$quiz" },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: "$scoreValue" },
          passed: {
            $sum: {
              $cond: [{ $gte: ["$scoreValue", { $ifNull: ["$quiz.pass_score", 70] }] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [{ $lt: ["$scoreValue", { $ifNull: ["$quiz.pass_score", 70] }] }, 1, 0],
            },
          },
        },
      },
    ]);

    return ok({
      totalStudents,
      totalAttempts: recap?.totalAttempts ?? 0,
      averageScore: Number(((recap?.averageScore ?? 0) as number).toFixed(2)),
      passed: recap?.passed ?? 0,
      failed: recap?.failed ?? 0,
      quizzesCount,
    });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("FORBIDDEN")) return fail("Forbidden", 403);
    return fail("Failed to fetch module recap", 500, { error: String(e) });
  }
}
