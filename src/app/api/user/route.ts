import { connectDb } from "@/lib/db";
import { User, requireAuth, hashPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/response";
import { saveUpload } from "@/lib/upload";

export async function GET() {
  try {
    const auth = await requireAuth();
    await connectDb();

    const user = await User.findById(auth.sub).select("name email role profile_url createdAt");
    return ok(user);
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to fetch profile", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth();
    await connectDb();

    const ct = req.headers.get("content-type") || "";
    const patch: Record<string, unknown> = {};

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("name")) patch.name = String(form.get("name"));
      if (form.get("email")) patch.email = String(form.get("email"));
      const profile = form.get("profile_url");
      if (profile instanceof File && profile.size > 0) patch.profile_url = await saveUpload(profile, "profile_pictures");
    } else {
      const body = await req.json();
      patch.name = body.name;
      patch.email = body.email;
      if (body.profile_url) patch.profile_url = body.profile_url;
    }

    const user = await User.findByIdAndUpdate(auth.sub, patch, { new: true }).select("name email role profile_url");
    return ok({ message: "Profile updated successfully", user });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to update profile", 422, { error: String(e) });
  }
}
