import { z } from "zod";
import { requireAdminOrGuru } from "@/lib/auth";
import { ensurePhaseAccess } from "@/lib/access";
import { connectDb } from "@/lib/db";
import { Material } from "@/lib/models/Material";
import { fail, ok } from "@/lib/response";
import { saveUpload } from "@/lib/upload";

const materialSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["pdf", "video", "link"]),
  url: z.string().trim().min(1),
  description: z.string().optional().default(""),
  order: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    const { phase } = await ensurePhaseAccess(id, auth);
    const materials = await Material.find({ phaseId: phase._id }).sort({ order: 1, createdAt: 1 });
    return ok(materials);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to fetch materials", 500, { error: String(e) });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminOrGuru();
    const { id } = await params;
    const { phase } = await ensurePhaseAccess(id, auth);
    const ct = req.headers.get("content-type") || "";

    let raw: any = { title: "", type: "link", url: "", description: "", order: 0, isVisible: true };

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      raw = {
        title: String(form.get("title") || "").trim(),
        type: String(form.get("type") || "link"),
        url: String(form.get("url") || "").trim(),
        description: String(form.get("description") || "").trim(),
        order: Number(form.get("order") ?? 0),
        isVisible: String(form.get("isVisible") || "true") === "true",
      };
      const file = form.get("file") || form.get("upload") || form.get("media");
      if (file instanceof File && file.size > 0) raw.url = await saveUpload(file, "materials");
    } else {
      const body = await req.json();
      raw = { ...body, order: Number(body.order ?? 0) };
    }

    const parsed = materialSchema.safeParse(raw);
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    await connectDb();
    const material = await Material.create({ phaseId: phase._id, createdBy: auth.sub, ...parsed.data });
    return ok(material, 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("NOT_FOUND")) return fail("Phase not found", 404);
    return fail("Failed to create material", 422, { error: String(e) });
  }
}
