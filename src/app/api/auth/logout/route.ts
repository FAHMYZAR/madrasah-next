import { clearSession } from "@/lib/auth";
import { ok } from "@/lib/response";

export async function POST() {
  await clearSession();
  return ok({ message: "Logged out successfully" });
}
