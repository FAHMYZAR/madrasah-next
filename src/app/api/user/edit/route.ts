import { fail } from "@/lib/response";

// Deprecated endpoint: use PATCH /api/user instead.
export async function POST() {
  return fail("Endpoint deprecated. Gunakan PATCH /api/user", 410);
}
