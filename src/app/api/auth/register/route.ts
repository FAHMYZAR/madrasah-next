import { z } from "zod";
import { connectDb } from "@/lib/db";
import { User, hashPassword, setSession } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

const registerSchema = z.object({
  name: z.string().trim().min(1),
  nim: z.string().trim().min(1),
  password: z.string().min(6),
  className: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Validation failed", 422, parsed.error.flatten());
    const { name, nim, password, className } = parsed.data;

    await connectDb();
    const existing = await User.findOne({ nim: String(nim).trim() });
    if (existing) return fail("NIM already registered", 409);

    const user = await User.create({
      name,
      nim: String(nim).trim(),
      className: className || "",
      password: await hashPassword(password),
      role: "user",
    });

    await setSession({ _id: String(user._id), nim: user.nim, name: user.name, role: user.role });
    return ok({ user: { id: user._id, nim: user.nim, name: user.name, role: user.role } }, 201);
  } catch (e: unknown) {
    return fail("Registration failed", 500, { error: String(e) });
  }
}
