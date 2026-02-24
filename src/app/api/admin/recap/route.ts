import { requireAdmin } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { Enrollment } from "@/lib/models/Enrollment";
import { Module } from "@/lib/models/Module";
import { Quiz } from "@/lib/models/Quiz";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { User } from "@/lib/models/User";
import { fail, ok } from "@/lib/response";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;

    const moduleId = searchParams.get("moduleId") || "";
    const quizId = searchParams.get("quizId") || "";
    const className = searchParams.get("className") || "";
    const status = searchParams.get("status") || "";
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    const [modules, quizzes, students, enrollments] = await Promise.all([
      Module.find({}).select("_id name code").lean(),
      Quiz.find({}).select("_id title module_id pass_score").lean(),
      User.find({ role: "user" }).select("_id nim name className").lean(),
      Enrollment.find({ status: "active" }).select("moduleId userId").lean(),
    ]);

    const moduleMap = new Map(modules.map((m: any) => [String(m._id), m]));
    const quizMap = new Map(quizzes.map((q: any) => [String(q._id), q]));
    const userMap = new Map(students.map((u: any) => [String(u._id), u]));

    let allowedQuizIds = quizzes.map((q: any) => String(q._id));
    if (moduleId) {
      allowedQuizIds = allowedQuizIds.filter((id) => String(quizMap.get(id)?.module_id || "") === moduleId);
    }
    if (quizId) {
      allowedQuizIds = allowedQuizIds.filter((id) => id === quizId);
    }

    const attemptMatch: Record<string, any> = { quiz_id: { $in: allowedQuizIds } };
    if (status) {
      attemptMatch.status = status;
    }

    const attempts = await QuizAttempt.find(attemptMatch).lean();

    const attemptsFiltered = attempts.filter((a: any) => {
      const user = userMap.get(String(a.user_id));
      if (!user) return false;
      if (className && String(user.className || "") !== className) return false;
      if (!search) return true;

      const quiz = quizMap.get(String(a.quiz_id));
      const mod = quiz ? moduleMap.get(String(quiz.module_id)) : null;

      return [
        String(user.name || "").toLowerCase(),
        String(user.nim || "").toLowerCase(),
        String(user.className || "").toLowerCase(),
        String(quiz?.title || "").toLowerCase(),
        String(mod?.name || "").toLowerCase(),
      ].some((v) => v.includes(search));
    });

    const totalAttempts = attemptsFiltered.length;
    const attemptsWithScore = attemptsFiltered.filter((a: any) => a.total_score !== null && a.total_score !== undefined);
    const averageScore = attemptsWithScore.length
      ? Number((attemptsWithScore.reduce((sum: number, a: any) => sum + Number(a.total_score || 0), 0) / attemptsWithScore.length).toFixed(2))
      : 0;

    const trendMap = new Map<string, { date: string; count: number; total: number }>();
    for (const a of attemptsWithScore) {
      const d = a.submitted_at || a.started_at;
      if (!d) continue;
      const date = new Date(d).toISOString().slice(0, 10);
      if (!trendMap.has(date)) trendMap.set(date, { date, count: 0, total: 0 });
      const row = trendMap.get(date)!;
      row.count += 1;
      row.total += Number(a.total_score || 0);
    }
    const trend = Array.from(trendMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map((r) => ({ date: r.date, attempts: r.count, averageScore: Number((r.total / Math.max(1, r.count)).toFixed(2)) }));

    const passed = attemptsWithScore.filter((a: any) => {
      const quiz = quizMap.get(String(a.quiz_id));
      const passScore = Number(quiz?.pass_score || 70);
      return Number(a.total_score || 0) >= passScore;
    }).length;
    const failed = attemptsWithScore.length - passed;

    const moduleStats = modules
      .map((m: any) => {
        const moduleQuizIds = quizzes.filter((q: any) => String(q.module_id) === String(m._id)).map((q: any) => String(q._id));
        const moduleAttempts = attemptsFiltered.filter((a: any) => moduleQuizIds.includes(String(a.quiz_id)));
        const withScore = moduleAttempts.filter((a: any) => a.total_score !== null && a.total_score !== undefined);
        const avg = withScore.length
          ? Number((withScore.reduce((sum: number, a: any) => sum + Number(a.total_score || 0), 0) / withScore.length).toFixed(2))
          : 0;

        const enrolledStudents = new Set(
          enrollments
            .filter((e: any) => String(e.moduleId) === String(m._id))
            .map((e: any) => String(e.userId))
        ).size;

        return {
          moduleId: String(m._id),
          moduleName: m.name,
          moduleCode: m.code,
          quizzesCount: moduleQuizIds.length,
          totalStudents: enrolledStudents,
          totalAttempts: moduleAttempts.length,
          averageScore: avg,
        };
      })
      .sort((a, b) => b.totalAttempts - a.totalAttempts);

    const rowsAll = attemptsFiltered
      .map((a: any) => {
        const user = userMap.get(String(a.user_id));
        const quiz = quizMap.get(String(a.quiz_id));
        const mod = quiz ? moduleMap.get(String(quiz.module_id)) : null;
        if (!user || !quiz) return null;
        return {
          attemptId: String(a._id),
          studentId: String(user._id),
          studentName: user.name,
          nim: user.nim,
          className: user.className || "-",
          moduleId: mod ? String(mod._id) : null,
          moduleName: mod?.name || "-",
          quizId: String(quiz._id),
          quizTitle: quiz.title,
          status: a.status,
          score: a.total_score ?? null,
          passScore: Number(quiz.pass_score || 70),
          startedAt: a.started_at || null,
          submittedAt: a.submitted_at || null,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const ta = a?.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const tb = b?.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return tb - ta;
      });

    const pagedRows = rowsAll.slice(skip, skip + limit);

    const classOptions = Array.from(new Set(students.map((u: any) => String(u.className || "")).filter(Boolean))).sort();

    return ok({
      summary: {
        totalStudents: students.length,
        totalModules: modules.length,
        totalQuizzes: quizzes.length,
        totalAttempts,
        averageScore,
        passed,
        failed,
      },
      filters: {
        modules: modules.map((m: any) => ({ _id: String(m._id), name: m.name })),
        quizzes: quizzes.map((q: any) => ({ _id: String(q._id), title: q.title, moduleId: String(q.module_id) })),
        classes: classOptions,
      },
      moduleStats,
      trend,
      rows: pagedRows,
      meta: {
        page,
        limit,
        total: rowsAll.length,
        totalPages: Math.ceil(rowsAll.length / limit) || 1,
      },
    });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch recap", 500, e);
  }
}
