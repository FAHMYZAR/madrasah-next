import { z } from "zod";
import { requireAdminOrGuru } from "@/lib/auth";
import { ensureModuleAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { Phase } from "@/lib/models/Phase";
import { fail, ok } from "@/lib/response";

const createPhaseSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional().default(""),
  order: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await ensureModuleAccess(id, auth);
    const phases = await Phase.find({ moduleId: id }).sort({ order: 1, createdAt: 1 });
    return ok(phases);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Module not found", 404);
    return fail("Failed to fetch phases", 500, { error: String(e) });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await connectDb();
    await ensureModuleAccess(id, auth);

    const body = await req.json();
    const parsed = createPhaseSchema.safeParse({ ...body, order: Number(body.order ?? 0) });
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const phase = await Phase.create({ moduleId: id, ...parsed.data, createdBy: auth.sub });
    return ok(phase, 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Module not found", 404);
    return fail("Failed to create phase", 422, { error: String(e) });
  }
}
