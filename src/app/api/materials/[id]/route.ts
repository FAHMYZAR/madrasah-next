import { z } from "zod";
import { requireAdminOrGuru } from "@/lib/auth";
import { ensureMaterialAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { Material } from "@/lib/models/Material";
import { fail, ok } from "@/lib/response";

const patchMaterialSchema = z.object({
  title: z.string().trim().min(1).optional(),
  url: z.string().trim().min(1).optional(),
  type: z.enum(["pdf", "video", "link"]).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await connectDb();
    await ensureMaterialAccess(id, auth);

    const body = await req.json();
    const parsed = patchMaterialSchema.safeParse({ ...body, order: body.order !== undefined ? Number(body.order) : undefined });
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const updated = await Material.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!updated) return fail("Material not found", 404);
    return ok(updated);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Material not found", 404);
    return fail("Failed to update material", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    await connectDb();
    await ensureMaterialAccess(id, auth);

    await Material.findByIdAndDelete(id);
    return ok({ message: "Material deleted" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Material not found", 404);
    return fail("Failed to delete material", 422, { error: String(e) });
  }
}
