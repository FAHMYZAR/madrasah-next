import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, error?: unknown): NextResponse {
  const body: Record<string, unknown> = { success: false, message };
  if (error) body.error = String(error);
  return NextResponse.json(body, { status });
}
