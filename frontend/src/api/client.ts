export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export async function requestJson<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body === undefined ? undefined : { "content-type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error("Unable to reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string; details?: { path: string; message: string }[] } | null;
    const detail = payload?.details?.map((item) => `${item.path}: ${item.message}`).join("; ");
    throw new Error([payload?.error || `Request failed (${response.status})`, detail].filter(Boolean).join(": "));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function postJson<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(path, { method: "POST", body });
}
