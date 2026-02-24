import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { fail, ok } from "@/lib/response";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDb();

    const mod = await Module.findById(id);
    if (!mod) return fail("Module not found", 404);

    return ok(mod);
  } catch (e: unknown) {
    return fail("Failed to fetch module", 500, { error: String(e) });
  }
}
