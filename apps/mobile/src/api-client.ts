import type { ApiError, ApiSuccess } from "@lyne/shared";

export class ApiFailure extends Error {
  constructor(message: string, public status: number, public code = "REQUEST_FAILED") { super(message); }
}
export type ClientOptions = { base: string; token: string | null; web: boolean; development: boolean; onUnauthorized: () => Promise<void> };
function envelope(value: unknown): value is ApiSuccess<unknown> | ApiError {
  if (!value || typeof value !== "object" || !("ok" in value)) return false;
  if (value.ok === true) return "data" in value;
  return value.ok === false && "error" in value && !!value.error && typeof value.error === "object"
    && "message" in value.error && typeof value.error.message === "string"
    && "code" in value.error && typeof value.error.code === "string";
}
export async function apiRequest<T>(options: ClientOptions, path: string, body?: unknown, method?: "POST" | "PATCH", photo = false): Promise<T> {
  let base: URL;
  try { base = new URL(options.base); } catch { throw new Error("L’adresse de l’API doit être configurée."); }
  if (base.username || base.password || base.search || base.hash || !["http:", "https:"].includes(base.protocol)
    || (!options.development && base.protocol !== "https:")) throw new Error("L’adresse HTTPS de l’API doit être configurée.");
  const resource = path.split("?")[0]!;
  if (!resource.startsWith("/") || resource.startsWith("//") || resource.includes("\\") || resource.includes("..")) throw new Error("Adresse de requête invalide.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${options.base.replace(/\/$/, "")}/api/v1${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"), credentials: options.web ? "include" : "omit", signal: controller.signal,
      headers: { "X-Lyne-Client": options.web ? "web" : "mobile", ...(options.token && !options.web ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    // Revoke the local session even if an upstream proxy returns a non-JSON 401.
    if (response.status === 401) await options.onUnauthorized();
    if (photo && response.ok) {
      if (!response.headers.get("content-type")?.startsWith("image/jpeg")) throw new ApiFailure("Photo du serveur invalide.", response.status);
      const blob = await response.blob();
      if (blob.size > 2 * 1024 * 1024) throw new ApiFailure("Photo trop volumineuse.", response.status);
      return blob as T;
    }
    let result: unknown;
    try { result = await response.json(); } catch { throw new ApiFailure("Réponse du serveur inattendue.", response.status, "INVALID_RESPONSE"); }
    if (!envelope(result)) throw new ApiFailure("Réponse du serveur inattendue.", response.status, "INVALID_RESPONSE");
    if (!response.ok || !result.ok) throw new ApiFailure(result.ok ? "Requête refusée." : result.error.message, response.status, result.ok ? undefined : result.error.code);
    return result.data as T;
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    throw new Error("Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.");
  } finally { clearTimeout(timer); }
}
