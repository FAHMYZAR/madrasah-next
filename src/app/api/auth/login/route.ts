import { z } from "zod";
import { connectDb } from "@/lib/db";
import { User, setSession, verifyPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

const loginSchema = z.object({
  email: z.string().email().optional(),
  nim: z.string().trim().min(1).optional(),
  password: z.string().optional(),
}).refine((v) => !!v.email || !!v.nim, { message: "Email atau NIM wajib diisi" });

export async function POST(req: Request) {
  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());
    const { email, nim, password } = parsed.data;

    await connectDb();

    let user = null;
    if (email) user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user && nim) user = await User.findOne({ nim: String(nim).trim() });

    if (!user || !user.isActive) return fail("Invalid credentials", 401);

    if (user.role === "admin" || user.role === "guru") {
      if (!password) return fail("Validation failed", 422, "Password wajib untuk admin/guru");
      const valid = await verifyPassword(password, user.password);
      if (!valid) return fail("Invalid credentials", 401);
    } else if (password) {
      const valid = await verifyPassword(password, user.password);
      if (!valid) return fail("Invalid credentials", 401);
    }

    await setSession({ _id: String(user._id), nim: user.nim, name: user.name, role: user.role });
    return ok({ user: { id: user._id, nim: user.nim, name: user.name, email: user.email, role: user.role, className: user.className, isActive: user.isActive } });
  } catch (e: unknown) {
    return fail("Login failed", 500, { error: String(e) });
  }
}
