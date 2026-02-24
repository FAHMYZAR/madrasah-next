import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { fail, ok } from "@/lib/response";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin();
    const body = await req.json();
    await connectDb();

    const user = await User.findById(auth.sub);
    if (!user) return fail("User not found", 404);

    const valid = await bcrypt.compare(body.current_password || "", user.password);
    if (!valid) return fail("Current password is incorrect", 422);

    user.password = await bcrypt.hash(body.password, 10);
    await user.save();

    return ok({ message: "Password updated successfully" });
  } catch (e: unknown) {
    return fail("Failed update password", 422, { error: String(e) });
  }
}
