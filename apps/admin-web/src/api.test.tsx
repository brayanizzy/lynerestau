import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api.js";

afterEach(() => vi.unstubAllGlobals());

describe("réponses du client API", () => {
  it.each([null, {}, { ok: true }, { ok: false }, { ok: false, error: { code: 4, message: null } }])(
    "signale une enveloppe invalide en français", async body => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
      await expect(api("/auth/me")).rejects.toMatchObject({ code: "INVALID_RESPONSE", message: "Le serveur a renvoyé une réponse inattendue." });
    },
  );
  it("renvoie les données d’une réponse valide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true, data: { id: "demo" } })));
    await expect(api("/auth/me")).resolves.toEqual({ id: "demo" });
  });
  it("conserve le message métier du serveur", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: false, error: { code: "VERSION_CONFLICT", message: "Actualisez la fiche." } }, { status: 409 })));
    await expect(api("/employees/demo")).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT", message: "Actualisez la fiche." });
  });
  it("révoque l’affichage de session même si une réponse 401 n’est pas du JSON", async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("session expirée", { status: 401 })));
    await expect(api("/auth/me")).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "lyne:session-expired" }));
  });
});
