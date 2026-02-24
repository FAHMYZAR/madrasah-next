import { z } from "zod";
import { connectDb } from "@/lib/db";
import { User, requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/response";
import { saveUpload } from "@/lib/upload";

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  profile_url: z.string().optional(),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    await connectDb();
    const user = await User.findById(auth.sub).select("name email role profile_url createdAt");
    return ok(user);
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to fetch profile", 500, { error: String(e) });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAuth();
    await connectDb();

    const ct = req.headers.get("content-type") || "";
    let raw: Record<string, unknown> = {};

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      raw = {
        name: form.get("name") ? String(form.get("name")) : undefined,
        email: form.get("email") ? String(form.get("email")) : undefined,
      };
      const profile = form.get("profile_url");
      if (profile instanceof File && profile.size > 0) raw.profile_url = await saveUpload(profile, "profile_pictures");
    } else {
      raw = await req.json();
    }

    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());

    const user = await User.findByIdAndUpdate(auth.sub, parsed.data, { new: true }).select("name email role profile_url");
    return ok({ message: "Profile updated successfully", user });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to update profile", 422, { error: String(e) });
  }
}
