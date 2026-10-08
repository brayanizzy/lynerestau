import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PERMISSIONS } from "@lyne/shared";
import { buildApp, STATIC_PHASE } from "../src/app.js";
import { readConfig } from "../src/config.js";
import { hashPassword, tokenHash, verifyPassword } from "../src/auth/password.js";
import { databaseUrl } from "../src/database-config.js";
import { MemoryRepository } from "./memory-repository.js";

const password = "Test-only-Password-2026!";
let passwordHash: string;
beforeAll(async () => { passwordHash = await hashPassword(password); });
let app: Awaited<ReturnType<typeof buildApp>>;
let repo: MemoryRepository;
let clock: Date;
const webHeaders = { origin: "http://localhost:5173", "x-lyne-client": "web" };
const mobileHeaders = { "x-lyne-client": "mobile" };
const bearer = (token: string) => ({ ...mobileHeaders, authorization: `Bearer ${token}` });
async function login(identifier = "admin", headers: Record<string, string> = mobileHeaders) {
  return app.inject({ method: "POST", url: "/api/v1/auth/login", headers, payload: { identifier, password } });
}
async function token(identifier = "admin") { return (await login(identifier)).json().data.token as string; }
beforeEach(async () => {
  clock = new Date("2026-09-25T12:00:00Z");
  repo = new MemoryRepository();
  repo.users.push({ id: "admin-id", username: "admin", displayName: "Administrateur", email: "admin@example.test", passwordHash,
    isActive: true, mustChangePassword: false, authVersion: 1, role: { code: "ADMIN", name: "Administrateur" }, permissions: [...PERMISSIONS] });
  app = await buildApp({ repository: repo, now: () => clock, config: readConfig({ NODE_ENV: "test" }) });
});
afterEach(async () => { await app?.close(); });

describe("authentification et sessions", () => {
  it("hash Argon2id et empreinte SHA256 sans jeton en clair", async () => {
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(passwordHash, password)).toBe(true);
    expect(await verifyPassword(passwordHash, "incorrect")).toBe(false);
    const response = await login();
    expect(response.statusCode).toBe(200);
    const data = response.json().data;
    expect(data.user.passwordHash).toBeUndefined();
    expect(data.token).toHaveLength(43);
    expect(repo.sessions[0]!.tokenHash).toBe(tokenHash(data.token));
    expect(JSON.stringify(repo.events)).not.toContain(data.token);
    expect(JSON.stringify(repo.events)).not.toContain(password);
  });
  it("accepte l’identifiant normalisé et l’e-mail", async () => {
    expect((await login(" ADMIN ")).statusCode).toBe(200);
    expect((await login("admin@example.test")).statusCode).toBe(200);
  });
  it("cookie web HttpOnly, SameSite Strict, sans jeton dans le JSON", async () => {
    const response = await login("admin", webHeaders);
    expect(response.json().data.token).toBeUndefined();
    expect(response.headers["set-cookie"]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]).toContain("SameSite=Strict");
    const cookie = response.cookies[0]!;
    const me = await app.inject({ url: "/api/v1/auth/me", cookies: { [cookie.name]: cookie.value } });
    expect(me.statusCode).toBe(200);
    expect(me.headers["cache-control"]).toBe("no-store");
  });
  it("cookie production préfixé __Host et Secure", async () => {
    await app.close();
    app = await buildApp({ repository: repo, config: readConfig({ NODE_ENV: "production", API_LOG_LEVEL: "silent", CORS_ORIGINS: "https://lyne.example" }) });
    const response = await login("admin", { "x-lyne-client": "web", origin: "https://lyne.example" } as typeof mobileHeaders);
    expect(response.cookies[0]!.name).toBe("__Host-lyne_session");
    expect(response.headers["set-cookie"]).toContain("Secure");
  });
  it("refuse les comptes inconnus, inactifs et mauvais mots de passe avec la même réponse", async () => {
    const unknown = await login("missing");
    repo.users[0]!.isActive = false;
    const inactive = await login();
    repo.users[0]!.isActive = true;
    const wrong = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: mobileHeaders, payload: { identifier: "admin", password: "incorrect" } });
    expect(unknown.statusCode).toBe(401);
    expect(inactive.body).toBe(unknown.body);
    expect(wrong.body).toBe(unknown.body);
    expect(repo.events).toHaveLength(3);
  });
  it("refuse jetons absents, malformés ou inconnus", async () => {
    for (const authorization of [undefined, "Bearer bad", `Bearer ${"x".repeat(43)}`]) {
      const response = await app.inject({ url: "/api/v1/auth/me", headers: authorization ? { authorization } : {} });
      expect(response.statusCode).toBe(401);
    }
  });
  it("révoque effectivement à la déconnexion et conserve l’audit", async () => {
    const headers = bearer(await token());
    expect((await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers })).statusCode).toBe(200);
    expect((await app.inject({ url: "/api/v1/auth/me", headers })).statusCode).toBe(401);
    expect(repo.events.map(e => e.action)).toEqual(["auth.login.succeeded", "auth.logout"]);
  });
  it("refuse une session expirée, un compte désactivé et une ancienne version d’authentification", async () => {
    const headers = bearer(await token());
    clock = new Date(clock.getTime() + 8 * 3600000);
    expect((await app.inject({ url: "/api/v1/auth/me", headers })).statusCode).toBe(401);
    clock = new Date(clock.getTime() - 8 * 3600000);
    repo.users[0]!.isActive = false;
    expect((await app.inject({ url: "/api/v1/auth/me", headers })).statusCode).toBe(401);
    repo.users[0]!.isActive = true;
    repo.users[0]!.authVersion++;
    expect((await app.inject({ url: "/api/v1/auth/me", headers })).statusCode).toBe(401);
  });
  it("impose le changement initial et invalide toutes les sessions", async () => {
    repo.users[0]!.mustChangePassword = true;
    const headers = bearer(await token());
    const second = bearer(await token());
    const blocked = await app.inject({ url: "/api/v1/users", headers });
    expect(blocked.json().error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    const response = await app.inject({ method: "POST", url: "/api/v1/auth/password", headers,
      payload: { currentPassword: password, newPassword: "New-Private-Password-2026!" } });
    expect(response.statusCode).toBe(200);
    expect(repo.users[0]!.mustChangePassword).toBe(false);
    expect(await verifyPassword(repo.users[0]!.passwordHash, "New-Private-Password-2026!")).toBe(true);
    for (const h of [headers, second]) expect((await app.inject({ url: "/api/v1/auth/me", headers: h })).statusCode).toBe(401);
    expect((await login()).statusCode).toBe(401);
    expect(repo.events.some(e => e.action === "auth.password.changed")).toBe(true);
  });
  it("refuse mot de passe court, inchangé ou mot de passe actuel incorrect", async () => {
    const headers = bearer(await token());
    for (const payload of [{ currentPassword: password, newPassword: "short" }, { currentPassword: password, newPassword: password },
      { currentPassword: "incorrect", newPassword: "Long-enough-Password!" }]) {
      expect((await app.inject({ method: "POST", url: "/api/v1/auth/password", headers, payload })).statusCode).toBe(400);
    }
    expect(repo.users[0]!.passwordHash).toBe(passwordHash);
  });
});

describe("autorisations, entrées et exploitation", () => {
  it("protège toutes les routes d’administration côté serveur", async () => {
    repo.users.push({ ...repo.users[0]!, id: "kitchen-id", username: "kitchen", email: null, role: { code: "KITCHEN", name: "Cuisine" }, permissions: [] });
    const admin = bearer(await token());
    const kitchen = bearer(await token("kitchen"));
    for (const url of ["/api/v1/users", "/api/v1/roles", "/api/v1/permissions", "/api/v1/audit-logs", "/api/v1/openapi.json", "/api/docs/"]) {
      expect((await app.inject({ url })).statusCode).toBe(401);
      expect((await app.inject({ url, headers: kitchen })).statusCode).toBe(403);
      expect((await app.inject({ url, headers: admin })).statusCode).toBe(200);
    }
  });
  it("relit les permissions à chaque requête", async () => {
    const headers = bearer(await token());
    repo.users[0]!.permissions = [];
    expect((await app.inject({ url: "/api/v1/users", headers })).statusCode).toBe(403);
  });
  it("borne la pagination et ne divulgue pas les hashes", async () => {
    const headers = bearer(await token());
    for (const query of ["page=0", "page=-1", "page=abc", "pageSize=101", "page=1.5"]) {
      expect((await app.inject({ url: `/api/v1/users?${query}`, headers })).statusCode).toBe(400);
    }
    const response = await app.inject({ url: "/api/v1/users?pageSize=1", headers });
    expect(response.json().data.items).toHaveLength(1);
    expect(response.body).not.toContain("passwordHash");
    expect(response.body).not.toContain("authVersion");
  });
  it("valide strictement les corps, y compris les propriétés supplémentaires", async () => {
    for (const payload of [{ identifier: "admin" }, { identifier: "admin", password, role: "ADMIN" }, { identifier: {}, password }]) {
      expect((await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: mobileHeaders, payload })).statusCode).toBe(400);
    }
  });
  it("refuse les origines externes et la falsification du type client sur une session cookie", async () => {
    expect((await login("admin", { ...webHeaders, origin: "https://evil.example" })).statusCode).toBe(403);
    expect((await login("admin", { "x-lyne-client": "web" })).statusCode).toBe(403);
    const response = await login("admin", webHeaders);
    const c = response.cookies[0]!;
    expect((await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: mobileHeaders, cookies: { [c.name]: c.value } })).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: webHeaders, cookies: { [c.name]: c.value } })).statusCode).toBe(200);
  });
  it("limite les tentatives sans faire confiance à X-Forwarded-For", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: { ...mobileHeaders, "x-forwarded-for": `10.0.0.${i}` },
        payload: { identifier: "missing", password } })).statusCode).toBe(401);
    }
    const limited = await login();
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error.code).toBe("RATE_LIMITED");
    expect(repo.events).toHaveLength(10);
  });
  it("health reflète la DB sans exposer ses erreurs", async () => {
    expect((await app.inject("/health")).json()).toEqual({ status: "ok", database: "up", phase: STATIC_PHASE });
    expect((await app.inject("/api/health")).json()).toEqual({ status: "ok", database: "up", phase: STATIC_PHASE });
    repo.available = false;
    const response = await app.inject("/health");
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain("private");
  });
  it("ne divulgue pas les erreurs internes", async () => {
    repo.findUser = async () => { throw new Error("mysql://user:secret@private-db"); };
    const response = await login();
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("secret");
    expect(response.json().error.code).toBe("INTERNAL_ERROR");
  });
  it("encode correctement les secrets DB et refuse CORS wildcard/HTTP en production", () => {
    const url = new URL(databaseUrl({ DB_PASSWORD: "special@:/?#%", DB_USER: "user", DB_NAME: "test" }));
    expect(decodeURIComponent(url.password)).toBe("special@:/?#%");
    expect(() => readConfig({ CORS_ORIGINS: "*" })).toThrow();
    expect(() => readConfig({ NODE_ENV: "production" })).toThrow();
  });
});
