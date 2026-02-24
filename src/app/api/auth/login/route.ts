import { connectDb } from "@/lib/db";
import { User, setSession, verifyPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, nim, password } = body;

    if (!email && !nim) {
      return fail("Email atau NIM wajib diisi", 422);
    }

    await connectDb();

    let user = null;
    if (email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim() });
    }
    if (!user && nim) {
      user = await User.findOne({ nim: String(nim).trim() });
    }

    if (!user || !user.isActive) {
      return fail("Invalid credentials", 401);
    }

    // Admin/Guru wajib password. User (siswa) boleh login hanya dengan NIM (tanpa password).
    if (user.role === "admin" || user.role === "guru") {
      if (!password) return fail("Password wajib untuk admin/guru", 422);
      const valid = await verifyPassword(password, user.password);
      if (!valid) return fail("Invalid credentials", 401);
    } else {
      // role user (siswa)
      if (password) {
        const valid = await verifyPassword(password, user.password);
        if (!valid) return fail("Invalid credentials", 401);
      }
      // jika tidak ada password, lolos dengan NIM saja
    }

    await setSession({ _id: String(user._id), nim: user.nim, name: user.name, role: user.role });

    return ok({ user: { id: user._id, nim: user.nim, name: user.name, email: user.email, role: user.role, className: user.className, isActive: user.isActive } });
  } catch (e: unknown) {
    return fail("Login failed", 500, { error: String(e) });
  }
}
