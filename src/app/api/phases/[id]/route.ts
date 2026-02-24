import { z } from "zod";
import { requireAdminOrGuru } from "@/lib/auth";
import { ensurePhaseAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { Phase } from "@/lib/models/Phase";
import { fail, ok } from "@/lib/response";

const patchPhaseSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    const { phase } = await ensurePhaseAccess(id, auth);
    return ok(phase);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to fetch phase", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await connectDb();
    await ensurePhaseAccess(id, auth);

    const body = await req.json();
    const parsed = patchPhaseSchema.safeParse({ ...body, order: body.order !== undefined ? Number(body.order) : undefined });
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const updated = await Phase.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!updated) return fail("Phase not found", 404);
    return ok(updated);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to update phase", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await connectDb();
    await ensurePhaseAccess(id, auth);
    await Phase.findByIdAndDelete(id);
    return ok({ message: "Phase deleted" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to delete phase", 422, { error: String(e) });
  }
}
