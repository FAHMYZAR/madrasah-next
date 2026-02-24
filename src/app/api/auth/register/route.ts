import { connectDb } from "@/lib/db";
import { User, hashPassword, setSession } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, nim, password, className } = body;

    if (!name || !nim || !password) {
      return fail("Name, NIM, and password are required", 422);
    }

    await connectDb();

    const existing = await User.findOne({ nim: String(nim).trim() });
    if (existing) {
      return fail("NIM already registered", 409);
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      nim: String(nim).trim(),
      className: className || "",
      password: hashedPassword,
      role: "user",
    });

    await setSession({ _id: String(user._id), nim: user.nim, name: user.name, role: user.role });

    return ok({ user: { id: user._id, nim: user.nim, name: user.name, role: user.role } }, 201);
  } catch (e: unknown) {
    return fail("Registration failed", 500, { error: String(e) });
  }
}
