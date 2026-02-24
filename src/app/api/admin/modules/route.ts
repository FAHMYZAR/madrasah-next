import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/response";
import { saveUpload } from "@/lib/upload";

function normalizeCode(name?: string) {
  if (!name) return `MOD-${Date.now()}`;
  return name.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 30) + "-" + Date.now();
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }
    if (auth.role === "guru") query.assignedTeacherId = auth.sub;

    const [modules, total] = await Promise.all([
      Module.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Module.countDocuments(query),
    ]);

    return ok({ data: modules, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, search } });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch modules", 500, { error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    await connectDb();

    const ct = req.headers.get("content-type") || "";
    const payload: Record<string, any> = {
      createdBy: actor.sub,
      assignedTeacherId: actor.role === "guru" ? actor.sub : undefined,
    };

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      payload.name = String(form.get("name") || "").trim();
      payload.description = String(form.get("description") || "").trim();
      payload.code = String(form.get("code") || "").trim();
      payload.visibility = String(form.get("visibility") || "private");
      payload.enrollmentType = String(form.get("enrollmentType") || "manual");
      payload.enrollKey = String(form.get("enrollKey") || "").trim() || null;
      payload.startDate = form.get("startDate") ? new Date(String(form.get("startDate"))) : null;
      payload.endDate = form.get("endDate") ? new Date(String(form.get("endDate"))) : null;
      payload.isActive = String(form.get("isActive") || "true") === "true";
      const teacher = form.get("assignedTeacherId");
      if (teacher) payload.assignedTeacherId = String(teacher);
      const image = form.get("image_url");
      const pdf = form.get("pdf_url");
      if (image instanceof File && image.size > 0) payload.image_url = await saveUpload(image, "images");
      if (pdf instanceof File && pdf.size > 0) payload.pdf_url = await saveUpload(pdf, "pdfs");
    } else {
      const body = await req.json();
      payload.name = String(body.name || "").trim();
      payload.description = String(body.description || "").trim();
      payload.code = String(body.code || "").trim();
      payload.visibility = body.visibility || "private";
      payload.enrollmentType = body.enrollmentType || "manual";
      payload.enrollKey = body.enrollKey || null;
      payload.startDate = body.startDate ? new Date(body.startDate) : null;
      payload.endDate = body.endDate ? new Date(body.endDate) : null;
      payload.isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
      if (body.assignedTeacherId) payload.assignedTeacherId = body.assignedTeacherId;
      payload.image_url = body.image_url;
      payload.pdf_url = body.pdf_url;
    }

    if (!payload.name || !payload.description) return fail("Name and description are required", 422);
    if (!payload.code) payload.code = normalizeCode(payload.name);
    if (actor.role === "guru") payload.assignedTeacherId = actor.sub;

    const mod = await Module.create(payload);
    return ok(mod.toObject(), 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to create module", 422, { error: String(e) });
  }
}
