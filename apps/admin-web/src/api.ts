import type { ApiError, ApiSuccess } from "@lyne/shared";

export class ApiFailure extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}
export const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
function isEnvelope(value: unknown): value is ApiSuccess<unknown> | ApiError {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("ok" in value)) return false;
  if (value.ok === true) return "data" in value;
  if (value.ok !== false || !("error" in value) || !value.error || typeof value.error !== "object") return false;
  return "code" in value.error && typeof value.error.code === "string"
    && "message" in value.error && typeof value.error.message === "string";
}
export async function api<T>(path: string, body?: unknown, method?: "POST" | "PATCH"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}/api/v1${path}`, { method: method ?? (body === undefined ? "GET" : "POST"), credentials: "include",
      headers: { "X-Lyne-Client": "web", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  } catch { throw new ApiFailure("Connexion au serveur impossible. Vérifiez le réseau, puis réessayez.", 0, "NETWORK_ERROR"); }
  if (response.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("lyne:session-expired"));
  let result: unknown;
  try { result = await response.json(); } catch { throw new ApiFailure("Le serveur a renvoyé une réponse inattendue.", response.status, "INVALID_RESPONSE"); }
  if (!isEnvelope(result)) throw new ApiFailure("Le serveur a renvoyé une réponse inattendue.", response.status, "INVALID_RESPONSE");
  if (!response.ok || !result.ok) {
    throw new ApiFailure(result.ok ? "Requête refusée." : result.error.message, response.status, result.ok ? "REQUEST_FAILED" : result.error.code);
  }
  return result.data as T;
}
