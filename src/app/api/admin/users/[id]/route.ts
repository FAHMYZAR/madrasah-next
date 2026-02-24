import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { User, requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/response";
import { saveUpload } from "@/lib/upload";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireAdmin();
    const ct = req.headers.get("content-type") || "";
    const patch: Record<string, unknown> = {};

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("name")) patch.name = String(form.get("name")).trim();
      if (form.get("nim")) patch.nim = String(form.get("nim")).trim();
      if (form.get("className")) patch.className = String(form.get("className"));
      if (form.get("isActive")) patch.isActive = String(form.get("isActive")) === "true";
      if (form.get("role")) {
        const r = String(form.get("role"));
        if (!["admin", "guru", "user"].includes(r)) return fail("Role invalid", 422);
        patch.role = r;
      }
      if (form.get("password")) patch.password = await bcrypt.hash(String(form.get("password")), 12);
      const profile = form.get("profile_url");
      if (profile instanceof File && profile.size > 0) patch.profile_url = await saveUpload(profile, "profile_pictures");
    } else {
      const body = await req.json();
      if (body.name !== undefined) patch.name = body.name;
      if (body.nim !== undefined) patch.nim = body.nim;
      if (body.className !== undefined) patch.className = body.className;
      if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
      if (body.role !== undefined) {
        if (!["admin", "guru", "user"].includes(String(body.role))) return fail("Role invalid", 422);
        patch.role = body.role;
      }
      if (body.profile_url !== undefined) patch.profile_url = body.profile_url;
      if (body.password) patch.password = await bcrypt.hash(body.password, 12);
    }

    await connectDb();
    const user = await User.findByIdAndUpdate(id, patch, { new: true }).select("nim name role className isActive profile_url");

    if (!user) return fail("User not found", 404);
    return ok(user);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to update user", 422, { error: String(e) });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin();
    if (auth.sub === id) return fail("You cannot delete your own account", 400);

    await connectDb();
    const user = await User.findByIdAndDelete(id);
    if (!user) return fail("User not found", 404);

    return ok({ message: "User deleted successfully" });
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to delete user", 422, { error: String(e) });
  }
}
