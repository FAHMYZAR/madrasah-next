import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { User, requireAuth } from "@/lib/auth";
import { fail, ok } from "@/lib/response";

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth();
    const body = await req.json();
    const { current_password, password, password_confirmation } = body;

    if (!current_password || !password || !password_confirmation) {
      return fail("All password fields are required", 422);
    }

    if (password !== password_confirmation) {
      return fail("Passwords do not match", 422);
    }

    if (password.length < 6) {
      return fail("Password must be at least 6 characters", 422);
    }

    await connectDb();

    const user = await User.findById(auth.sub);
    if (!user) return fail("User not found", 404);

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return fail("Current password is incorrect", 422);

    user.password = await bcrypt.hash(password, 12);
    await user.save();

    return ok({ message: "Password updated successfully" });
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) {
      return fail("Unauthorized", 401);
    }
    return fail("Failed to update password", 422, { error: String(e) });
  }
}
