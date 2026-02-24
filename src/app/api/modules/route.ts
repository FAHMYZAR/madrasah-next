import { connectDb } from "@/lib/db";
import { Module } from "@/lib/models/Module";
import { ok } from "@/lib/response";

export async function GET(req: Request) {
  await connectDb();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
  const skip = (page - 1) * limit;

  const [modules, total] = await Promise.all([
    Module.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Module.countDocuments(),
  ]);

  return ok({
    data: modules,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });
}
