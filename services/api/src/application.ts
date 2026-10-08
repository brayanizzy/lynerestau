import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import staticFiles from "@fastify/static";
import { resolve } from "node:path";
import { z } from "zod";
import { validatorCompiler, serializerCompiler, jsonSchemaTransform, type ZodTypeProvider } from "fastify-type-provider-zod";
import { ChangePasswordSchema, LoginSchema, PaginationSchema, type Permission } from "@lyne/shared";
import { readConfig, type Config } from "./config.js";
import { createDatabase } from "./db.js";
import { createRepository } from "./auth/prisma-repository.js";
import { hashPassword, newToken, tokenHash, verifyPassword } from "./auth/password.js";
import { publicUser, type AuthRepository, type StoredSession } from "./auth/types.js";
import { HttpError, failure } from "./errors.js";
import { createAdminRepository } from "./admin/repository.js";
import { registerAdministration } from "./admin/routes.js";
import { createPhotoStore, type PhotoStore } from "./admin/photos.js";
import { createMenuRepository, type MenuRepository } from "./menu/repository.js";
import { registerMenu } from "./menu/routes.js";
import type { AdminRepository } from "./admin/types.js";

declare module "fastify" {
  interface FastifyRequest { auth: StoredSession | null }
}
export const STATIC_PHASE = "3";

export async function buildApp(options: { repository?: AuthRepository; adminRepository?: AdminRepository; menuRepository?: MenuRepository; photos?: PhotoStore; config?: Config; now?: () => Date; webRoot?: string } = {}) {
  const config = options.config ?? readConfig();
  const now = options.now ?? (() => new Date());
  const db = options.repository ? undefined : createDatabase();
  const repository = options.repository ?? createRepository(db!);
  const administration = options.adminRepository ?? (db ? createAdminRepository(db) : undefined);
  const menu = options.menuRepository ?? (db ? createMenuRepository(db) : undefined);
  const app = Fastify({
    bodyLimit: 16 * 1024,
    trustProxy: config.TRUST_PROXY === "loopback" ? "loopback" : false,
    logger: config.NODE_ENV === "test" ? false : {
      level: config.API_LOG_LEVEL,
      redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie", "password", "token"],
    },
  }).withTypeProvider<ZodTypeProvider>();
  if (db) app.addHook("onClose", async () => { await db.$disconnect(); });
  app.decorateRequest("auth", null);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook("onRequest", async (_request, reply) => { reply.header("Cache-Control", "no-store"); });
  await app.register(cookie);
  await app.register(cors, { origin: config.origins, credentials: true, methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Lyne-Client"] });
  await app.register(helmet);
  await app.register(rateLimit, { global: false, max: config.AUTH_RATE_LIMIT_MAX, timeWindow: config.AUTH_RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: () => ({ statusCode: 429, ok: false, error: { code: "RATE_LIMITED", message: "Trop de tentatives. Réessayez plus tard." } }) });
  const cookieName = config.NODE_ENV === "production" ? "__Host-lyne_session" : "lyne_session";
  await app.register(swagger, {
    openapi: { info: { title: "LYNE RESTAURANT — API", version: "0.4.0", description: "Authentification, Personnel et catalogue / prix audités de Phase 3." },
      components: { securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: cookieName },
        bearerAuth: { type: "http", scheme: "bearer" } } } },
    transform: jsonSchemaTransform,
  });
  const dummyPassword = await hashPassword(newToken());
  const cookieOptions = { httpOnly: true, secure: config.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };
  const clearCookie = (reply: FastifyReply) => reply.clearCookie(cookieName, cookieOptions);
  const clientSchema = z.object({ "x-lyne-client": z.enum(["web", "mobile"]) }).passthrough();

  function checkOrigin(request: FastifyRequest, requireOrigin = false) {
    const origin = request.headers.origin;
    if ((requireOrigin && !origin) || (origin && !config.origins.includes(origin)))
      failure(403, "ORIGIN_FORBIDDEN", "Origine de la requête refusée.");
  }
  async function checkMutation(request: FastifyRequest) {
    const client = request.headers["x-lyne-client"];
    if (client !== "web" && client !== "mobile") failure(400, "CLIENT_REQUIRED", "Type de client requis.");
    checkOrigin(request, client === "web");
  }
  async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization;
    const fromCookie = header === undefined;
    const token = fromCookie ? request.cookies[cookieName] : /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header)?.[1];
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) failure(401, "UNAUTHENTICATED", "Veuillez vous connecter.");
    if (!fromCookie) checkOrigin(request);
    if (fromCookie && !["GET", "HEAD", "OPTIONS"].includes(request.method)) checkOrigin(request, true);
    const session = await repository.findSession(tokenHash(token));
    if (!session || session.revokedAt || session.expiresAt <= now() || !session.user.isActive || session.authVersion !== session.user.authVersion) {
      if (fromCookie) clearCookie(reply);
      failure(401, "UNAUTHENTICATED", "Session expirée ou révoquée. Reconnectez-vous.");
    }
    request.auth = session;
  }
  function authorize(permission: Permission) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await authenticate(request, reply);
      const user = request.auth!.user;
      if (user.mustChangePassword) failure(403, "PASSWORD_CHANGE_REQUIRED", "Changez votre mot de passe initial pour continuer.");
      if (!user.permissions.includes(permission)) failure(403, "FORBIDDEN", "Permission insuffisante.");
    };
  }
  const security: Record<string, string[]>[] = [{ bearerAuth: [] }, { sessionCookie: [] }];
  const authSchema = { tags: ["Authentification"], security };
  app.setErrorHandler((error, request, reply) => {
    const err = error as Error & { statusCode?: number; code?: string; validation?: unknown };
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
    if (status === 500) request.log.error({ errorName: err.name, errorCode: err.code, requestId: request.id }, "Échec de la requête");
    const code = err instanceof HttpError ? err.code : status === 400 ? "VALIDATION_ERROR" : status === 429 ? "RATE_LIMITED" : status === 413 ? "BODY_TOO_LARGE" : "INTERNAL_ERROR";
    const message = err instanceof HttpError ? err.message : status === 400 ? "Données invalides." : status === 413 ? "Requête trop volumineuse." : status === 429 ? "Trop de tentatives. Réessayez plus tard." : "Le service est momentanément indisponible.";
    reply.code(status).send({ ok: false, error: { code, message } });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ ok: false, error: { code: "NOT_FOUND", message: "Route introuvable." } }));
  app.get("/", { schema: { tags: ["Exploitation"] } }, async () => ({ service: "lyne-api", phase: STATIC_PHASE, status: "ok" }));
  for (const path of ["/health", "/api/health"]) app.get(path, { schema: { tags: ["Exploitation"], summary: "État API et connexion base" } }, async (_request, reply) => {
    try { await repository.ping(); return { status: "ok", database: "up", phase: STATIC_PHASE }; }
    catch { return reply.code(503).send({ status: "unavailable", database: "down", phase: STATIC_PHASE }); }
  });
  app.post("/api/v1/auth/login", {
    schema: { tags: ["Authentification"], summary: "Connexion web (cookie) ou mobile (Bearer)", body: LoginSchema, headers: clientSchema },
    onRequest: checkMutation, config: { rateLimit: {} },
  }, async (request, reply) => {
    const { identifier, password } = request.body;
    const user = await repository.findUser(identifier);
    const valid = await verifyPassword(user?.passwordHash ?? dummyPassword, password);
    if (!user || !valid || !user.isActive) {
      await repository.audit({ action: "auth.login.failed", module: "auth", userId: user?.id, ipAddress: request.ip });
      failure(401, "INVALID_CREDENTIALS", "Identifiant ou mot de passe incorrect.");
    }
    const token = newToken();
    const expiresAt = new Date(now().getTime() + config.SESSION_TTL_HOURS * 3600000);
    await repository.createSession({ tokenHash: tokenHash(token), userId: user.id, authVersion: user.authVersion, expiresAt },
      { action: "auth.login.succeeded", module: "auth", userId: user.id, objectId: user.id, ipAddress: request.ip });
    const data = { user: publicUser(user), expiresAt: expiresAt.toISOString() };
    if (request.headers["x-lyne-client"] === "web") {
      reply.setCookie(cookieName, token, { ...cookieOptions, expires: expiresAt, maxAge: config.SESSION_TTL_HOURS * 3600 });
      return { ok: true, data };
    }
    return { ok: true, data: { ...data, token } };
  });
  app.get("/api/v1/auth/me", { schema: authSchema, preHandler: authenticate }, async request => ({ ok: true,
    data: { user: publicUser(request.auth!.user), expiresAt: request.auth!.expiresAt.toISOString() } }));
  app.post("/api/v1/auth/logout", { schema: authSchema, onRequest: checkMutation, preHandler: authenticate }, async (request, reply) => {
    await repository.revokeSession(request.auth!.id, now(), { action: "auth.logout", module: "auth", userId: request.auth!.userId, ipAddress: request.ip });
    clearCookie(reply);
    return { ok: true, data: { message: "Déconnexion effectuée." } };
  });
  app.post("/api/v1/auth/password", { schema: { ...authSchema, body: ChangePasswordSchema }, onRequest: checkMutation,
    preHandler: authenticate, config: { rateLimit: {} } }, async (request, reply) => {
    const user = request.auth!.user;
    if (!await verifyPassword(user.passwordHash, request.body.currentPassword)) {
      await repository.audit({ action: "auth.password.failed", module: "auth", userId: user.id, ipAddress: request.ip });
      failure(400, "INVALID_PASSWORD", "Mot de passe actuel incorrect.");
    }
    if (request.body.newPassword === request.body.currentPassword) failure(400, "PASSWORD_UNCHANGED", "Choisissez un mot de passe différent.");
    const changed = await repository.changePassword(user, await hashPassword(request.body.newPassword), now(),
      { action: "auth.password.changed", module: "auth", userId: user.id, objectId: user.id, ipAddress: request.ip });
    if (!changed) failure(409, "SESSION_CHANGED", "Le compte a changé. Reconnectez-vous.");
    clearCookie(reply);
    return { ok: true, data: { message: "Mot de passe modifié. Reconnectez-vous sur vos appareils." } };
  });
  if (administration) registerAdministration(app, administration, options.photos ?? createPhotoStore(config.UPLOADS_DIR), authorize, checkMutation);
  else {
  app.get("/api/v1/users", { schema: { tags: ["Administration"], security, querystring: PaginationSchema }, preHandler: authorize("users.read") },
    async request => ({ ok: true, data: { ...await repository.listUsers(request.query), ...request.query } }));
  app.get("/api/v1/roles", { schema: { tags: ["Administration"], security }, preHandler: authorize("roles.read") },
    async () => ({ ok: true, data: await repository.listRoles() }));
  }
  app.get("/api/v1/capabilities", { schema: { tags: ["Exploitation"], security }, preHandler: authorize("menu.read") },
    async () => ({ ok: true, data: { menu: Boolean(menu) } }));
  if (menu) registerMenu(app, menu, options.photos ?? createPhotoStore(config.UPLOADS_DIR), authorize, checkMutation);
  app.get("/api/v1/permissions", { schema: { tags: ["Administration"], security }, preHandler: authorize("permissions.read") },
    async () => ({ ok: true, data: await repository.listPermissions() }));
  app.get("/api/v1/audit-logs", { schema: { tags: ["Audit"], security, querystring: PaginationSchema }, preHandler: authorize("audit.read") },
    async request => ({ ok: true, data: { ...await repository.listAudit(request.query), ...request.query } }));
  app.get("/api/v1/openapi.json", { schema: { hide: true }, preHandler: authorize("permissions.read") }, async () => app.swagger());
  await app.register(swaggerUi, { routePrefix: "/api/docs", staticCSP: true,
    uiHooks: { onRequest: authorize("permissions.read") }, uiConfig: { supportedSubmitMethods: [] } });
  if (options.webRoot) {
    await app.register(staticFiles, { root: resolve(options.webRoot), prefix: "/gestion/", cacheControl: false, index: "index.html" });
  }
  return app;
}
