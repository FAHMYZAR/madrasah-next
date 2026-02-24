import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { requireAdminOrGuru } from "@/lib/auth";
import { fail, ok } from "@/lib/response";
import { saveUpload } from "@/lib/upload";

async function loadManagedModule(id: string) {
  const auth = await requireAdminOrGuru();
  await connectDb();
  const mod = await Module.findById(id);
  if (!mod) return { auth, mod: null };
  if (auth.role === "guru" && String(mod.assignedTeacherId || mod.createdBy) !== auth.sub) throw new Error("FORBIDDEN");
  return { auth, mod };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { mod } = await loadManagedModule(id);
    if (!mod) return fail("Module not found", 404);
    return ok(mod);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch module", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { auth } = await loadManagedModule(id);

    const ct = req.headers.get("content-type") || "";
    const patch: Record<string, any> = {};

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("name")) patch.name = String(form.get("name")).trim();
      if (form.get("description")) patch.description = String(form.get("description")).trim();
      if (form.get("code")) patch.code = String(form.get("code")).trim();
      if (form.get("visibility")) patch.visibility = String(form.get("visibility"));
      if (form.get("enrollmentType")) patch.enrollmentType = String(form.get("enrollmentType"));
      if (form.has("enrollKey")) patch.enrollKey = String(form.get("enrollKey") || "") || null;
      if (form.get("startDate")) patch.startDate = new Date(String(form.get("startDate")));
      if (form.get("endDate")) patch.endDate = new Date(String(form.get("endDate")));
      if (form.get("isActive")) patch.isActive = String(form.get("isActive")) === "true";
      const teacher = form.get("assignedTeacherId");
      if (teacher && auth.role === "admin") patch.assignedTeacherId = String(teacher);
      const image = form.get("image_url");
      const pdf = form.get("pdf_url");
      if (image instanceof File && image.size > 0) patch.image_url = await saveUpload(image, "images");
      if (pdf instanceof File && pdf.size > 0) patch.pdf_url = await saveUpload(pdf, "pdfs");
    } else {
      const body = await req.json();
      if (body.name !== undefined) patch.name = String(body.name || "").trim();
      if (body.description !== undefined) patch.description = String(body.description || "").trim();
      if (body.code !== undefined) patch.code = String(body.code || "").trim();
      if (body.visibility !== undefined) patch.visibility = body.visibility;
      if (body.enrollmentType !== undefined) patch.enrollmentType = body.enrollmentType;
      if (body.enrollKey !== undefined) patch.enrollKey = body.enrollKey || null;
      if (body.startDate !== undefined) patch.startDate = body.startDate ? new Date(body.startDate) : null;
      if (body.endDate !== undefined) patch.endDate = body.endDate ? new Date(body.endDate) : null;
      if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
      if (body.assignedTeacherId !== undefined && auth.role === "admin") patch.assignedTeacherId = body.assignedTeacherId;
      if (body.image_url !== undefined) patch.image_url = body.image_url;
      if (body.pdf_url !== undefined) patch.pdf_url = body.pdf_url;
    }

    Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);

    const mod = await Module.findByIdAndUpdate(id, patch, { new: true });
    if (!mod) return fail("Module not found", 404);
    return ok(mod);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to update module", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await loadManagedModule(id);
    const mod = await Module.findByIdAndDelete(id);
    if (!mod) return fail("Module not found", 404);
    return ok({ message: "Module deleted successfully" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to delete module", 422, { error: String(e) });
  }
}
