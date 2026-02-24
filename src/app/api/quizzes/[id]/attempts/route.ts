import { connectDb } from "@/lib/db";
import { QuizAttempt } from "@/lib/models/QuizAttempt";
import { requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      QuizAttempt.find({ user_id: auth.sub, quiz_id: id, submitted_at: { $ne: null } })
        .sort({ submitted_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      QuizAttempt.countDocuments({ user_id: auth.sub, quiz_id: id, submitted_at: { $ne: null } }),
    ]);

    return ok({ data: attempts, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch attempts", 500, { error: String(e) });
  }
}

// Backward-compatible alias for starting an attempt
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    await connectDb();

    if (auth.role === "admin") return fail("Admin cannot take quizzes", 403);

    const attempt = await QuizAttempt.create({
      user_id: auth.sub,
      quiz_id: id,
      started_at: new Date(),
    });

    return ok(attempt, 201);
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to create attempt", 422, { error: String(e) });
  }
}
