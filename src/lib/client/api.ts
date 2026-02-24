type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: unknown;
};

export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers = isFormData ? (init?.headers || {}) : { "Content-Type": "application/json", ...(init?.headers || {}) };
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });

  const payload = (await res.json().catch(() => ({}))) as ApiEnvelope<T> | T;

  if (!res.ok) {
    const msg = (payload as ApiEnvelope<T>)?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  // Standard API response: { success: true, data: ... }
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  // Fallback for non-envelope responses
  return payload as T;
}
