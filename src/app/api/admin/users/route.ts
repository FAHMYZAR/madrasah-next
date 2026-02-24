import { connectDb } from "@/lib/db";
import { User, hashPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/response";
import { saveUpload } from "@/lib/upload";

export async function GET(req: Request) {
  try {
    await import("@/lib/auth").then((m) => m.requireAdmin());
    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const skip = (page - 1) * limit;
    const roleFilter = searchParams.get("role") || "";

    const query: Record<string, unknown> = {};
    if (roleFilter && ["admin", "guru", "user"].includes(roleFilter)) query.role = roleFilter;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("nim name className role isActive profile_url createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return ok({ data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, role: roleFilter || undefined } });
  } catch (e: unknown) {
    return fail("Unauthorized", 401, { error: String(e) });
  }
}

export async function POST(req: Request) {
  try {
    await import("@/lib/auth").then((m) => m.requireAdmin());
    await connectDb();

    const ct = req.headers.get("content-type") || "";
    let name = "", nim = "", password = "", role: "admin" | "guru" | "user" = "user", className = ""; let isActive = true;
    let profile_url: string | null = null;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      name = String(form.get("name") || "").trim();
      nim = String(form.get("nim") || "").trim();
      password = String(form.get("password") || "").trim();
      role = (String(form.get("role") || "user") as "admin" | "guru" | "user");
      className = String(form.get("className") || "").trim();
      isActive = String(form.get("isActive") || "true") === "true";
      const profile = form.get("profile_url");
      if (profile instanceof File && profile.size > 0) profile_url = await saveUpload(profile, "profile_pictures");
    } else {
      const body = await req.json();
      name = body.name?.trim();
      nim = body.nim?.trim();
      password = body.password?.trim();
      role = body.role || "user";
      className = body.className?.trim() || "";
      isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
      profile_url = body.profile_url || null;
    }

    if (!name || !nim || !password) return fail("Name, NIM, and password are required", 422);
    if (!["admin", "guru", "user"].includes(role)) return fail("Role is invalid", 422);
    if (password.length < 6) return fail("Password minimal 6 karakter", 422);

    const existing = await User.findOne({ nim });
    if (existing) return fail("NIM already registered", 409);

    const user = await User.create({
      name,
      nim,
      password: await hashPassword(password),
      role,
      className,
      isActive,
      profile_url,
    });

    return ok({ id: user._id, nim: user.nim, name: user.name, role: user.role, className: user.className, isActive: user.isActive, profile_url: user.profile_url }, 201);
  } catch (e: unknown) {
    if (String(e).includes("FORBIDDEN") || String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    return fail("Failed to create user", 422, { error: String(e) });
  }
}
