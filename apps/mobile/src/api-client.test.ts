import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, type ClientOptions } from "./api-client";
const settings = (): ClientOptions => ({ base: "https://lyne.invalid", token: "private-session", web: false, development: false, onUnauthorized: vi.fn(async () => {}) });
afterEach(() => vi.unstubAllGlobals());
describe("transport mobile", () => {
  it("envoie PATCH avec le jeton dans l’en-tête uniquement", async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true, data: { version: 2 } })); vi.stubGlobal("fetch", fetcher);
    expect(await apiRequest(settings(), "/employees/one", { version: 1 }, "PATCH")).toEqual({ version: 2 });
    expect(fetcher).toHaveBeenCalledWith("https://lyne.invalid/api/v1/employees/one", expect.objectContaining({ method: "PATCH", credentials: "omit", headers: expect.objectContaining({ Authorization: "Bearer private-session" }) }));
  });
  it("révoque une session même si un proxy répond 401 en HTML", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Unauthorized</html>", { status: 401 })));
    const options = settings(); await expect(apiRequest(options, "/auth/me")).rejects.toMatchObject({ status: 401 }); expect(options.onUnauthorized).toHaveBeenCalledOnce();
  });
  it("conserve les conflits pour que l’utilisateur recharge sa fiche", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: false, error: { code: "VERSION_CONFLICT", message: "Cette fiche a changé." } }, { status: 409 })));
    const options = settings(); await expect(apiRequest(options, "/employees/one", {}, "PATCH")).rejects.toMatchObject({ code: "VERSION_CONFLICT", status: 409 }); expect(options.onUnauthorized).not.toHaveBeenCalled();
  });
  it("refuse HTTP en production et les chemins externes avant tout envoi", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(apiRequest({ ...settings(), base: "http://lyne.invalid" }, "/employees")).rejects.toThrow("HTTPS");
    await expect(apiRequest(settings(), "//remote.invalid")).rejects.toThrow("invalide"); expect(fetcher).not.toHaveBeenCalled();
  });
  it("utilise les cookies sur le web sans envoyer de Bearer", async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true, data: [] })); vi.stubGlobal("fetch", fetcher);
    await apiRequest({ ...settings(), web: true }, "/employees");
    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ credentials: "include", headers: { "X-Lyne-Client": "web" } }));
  });
  it("n’accepte que les photos JPEG privées et rejette les réponses invalides", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/jpeg" } })));
    expect((await apiRequest<Blob>(settings(), "/employees/one/photo", undefined, undefined, true)).size).toBe(3);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "bad" })));
    await expect(apiRequest(settings(), "/employees")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(apiRequest(settings(), "/employees/one/photo", undefined, undefined, true)).rejects.toThrow("Photo");
  });
});
