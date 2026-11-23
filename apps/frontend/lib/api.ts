const defaultApiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://savecircle-backend.onrender.com/api"
    : "http://localhost:4000/api";

export const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || defaultApiBaseUrl
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function apiRequest<T>(path: string, { body, token, signal }: { body?: object; token?: string; signal?: AbortSignal } = {}): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal,
  }).catch((error: unknown) => {
    if (signal?.aborted) throw error;
    throw new Error("Could not reach the SaveCircle API. Try again in a moment.");
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = Array.isArray(error?.message) ? error.message.join(". ") : error?.message;
    throw new ApiError(message || `SaveCircle API returned HTTP ${response.status}.`, response.status);
  }

  return response.json();
}
