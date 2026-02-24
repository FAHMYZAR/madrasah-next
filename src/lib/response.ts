import { NextResponse } from "next/server";

function toCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function toSerializableObject(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const candidate = value as { toObject?: () => unknown };
  if (typeof candidate.toObject === "function") {
    return candidate.toObject();
  }

  return value;
}

function camelizeDeep(value: unknown): unknown {
  const serializable = toSerializableObject(value);

  if (Array.isArray(serializable)) {
    return serializable.map((item) => camelizeDeep(item));
  }

  if (serializable instanceof Date) return serializable;

  if (!isPlainObject(serializable)) {
    return serializable;
  }

  const input = serializable as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(input)) {
    if (key === "$__" || key === "$isNew" || key === "_doc") continue;
    const nextKey = key === "_id" || key === "__v" ? key : toCamelKey(key);
    output[nextKey] = camelizeDeep(val);
  }

  return output;
}

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data: camelizeDeep(data) }, { status });
}

export function fail(message: string, status = 400, error?: unknown): NextResponse {
  const body: Record<string, unknown> = { success: false, message };
  if (error !== undefined) {
    body.error = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  }
  return NextResponse.json(body, { status });
}
