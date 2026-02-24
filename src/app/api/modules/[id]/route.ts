import { requireAuth } from "@/lib/auth";
import { ensureModuleLearningAccess } from "@/lib/access";
import { fail, ok } from "@/lib/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const mod = await ensureModuleLearningAccess(id, auth);
    return ok(mod);
  } catch (e: unknown) {
    if (String(e).includes("UNAUTHORIZED")) return fail("Unauthorized", 401);
    if (String(e).includes("ENROLLMENT_REQUIRED") || String(e).includes("FORBIDDEN")) return fail("Forbidden", 403);
    if (String(e).includes("NOT_FOUND")) return fail("Module not found", 404);
    return fail("Failed to fetch module", 500, { error: String(e) });
  }
}
