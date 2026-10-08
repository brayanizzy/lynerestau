import type { FastifyInstance, FastifyRequest, onRequestHookHandler } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { MenuAvailabilitySchema, MenuCategoryInputSchema, MenuCategoryUpdateSchema, MenuItemInputSchema, MenuItemUpdateSchema, MenuQuerySchema, PaginationSchema, PhotoInputSchema, RecordIdSchema, VersionBodySchema, type Permission } from "@lyne/shared";
import type { Actor } from "../admin/types.js";
import { normalizePhoto, type PhotoStore } from "../admin/photos.js";
import { requireVersion } from "../admin/rules.js";
import { failure } from "../errors.js";
import type { MenuRepository } from "./repository.js";

export function registerMenu(app: FastifyInstance, repository: MenuRepository, photos: PhotoStore,
  authorize: (permission: Permission) => onRequestHookHandler, checkMutation: onRequestHookHandler) {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const security: Record<string, string[]>[] = [{ bearerAuth: [] }, { sessionCookie: [] }];
  const schema = { tags: ["Catalogue / Menu"], security };
  const params = z.object({ id: RecordIdSchema });
  const actor = (req: FastifyRequest): Actor => ({ id: req.auth!.userId, authVersion: req.auth!.user.authVersion,
    permissions: req.auth!.user.permissions, roleCode: req.auth!.user.role.code, ipAddress: req.ip });
  const mutate = (permission: Permission) => [checkMutation, authorize(permission)];
  api.get("/api/v1/menu/categories", { schema, onRequest: authorize("menu.read") }, async () => ({ ok: true, data: await repository.categories() }));
  api.post("/api/v1/menu/categories", { schema: { ...schema, body: MenuCategoryInputSchema }, onRequest: mutate("menu.write") }, async (req, reply) =>
    reply.code(201).send({ ok: true, data: await repository.saveCategory(actor(req), req.body) }));
  api.patch("/api/v1/menu/categories/:id", { schema: { ...schema, params, body: MenuCategoryUpdateSchema }, onRequest: mutate("menu.write") }, async req =>
    ({ ok: true, data: await repository.saveCategory(actor(req), req.body, req.params.id) }));
  api.get("/api/v1/menu/items", { schema: { ...schema, querystring: MenuQuerySchema }, onRequest: authorize("menu.read") }, async req => ({ ok: true, data: await repository.items(req.query) }));
  api.get("/api/v1/menu/items/:id", { schema: { ...schema, params }, onRequest: authorize("menu.read") }, async req => ({ ok: true, data: await repository.item(req.params.id) }));
  api.post("/api/v1/menu/items", { schema: { ...schema, body: MenuItemInputSchema }, onRequest: mutate("menu.write") }, async (req, reply) =>
    reply.code(201).send({ ok: true, data: await repository.saveItem(actor(req), req.body) }));
  api.patch("/api/v1/menu/items/:id", { schema: { ...schema, params, body: MenuItemUpdateSchema }, onRequest: mutate("menu.write") }, async req =>
    ({ ok: true, data: await repository.saveItem(actor(req), req.body, req.params.id) }));
  api.post("/api/v1/menu/items/:id/availability", { schema: { ...schema, params, body: MenuAvailabilitySchema }, onRequest: mutate("menu.availability") }, async req =>
    ({ ok: true, data: await repository.setAvailability(actor(req), req.params.id, req.body.version, req.body.isAvailable) }));
  api.get("/api/v1/menu/items/:id/prices", { schema: { ...schema, params, querystring: PaginationSchema }, onRequest: authorize("menu.read") }, async req =>
    ({ ok: true, data: await repository.prices(req.params.id, req.query) }));
  api.post("/api/v1/menu/items/:id/photo", { schema: { ...schema, params, body: PhotoInputSchema }, bodyLimit: 3 * 1024 * 1024,
    onRequest: mutate("menu.write"), config: { rateLimit: { max: 20, timeWindow: 60000 } } }, async req => {
    requireVersion((await repository.item(req.params.id)).version, req.body.version);
    const key = await photos.save(await normalizePhoto(req.body.data));
    return { ok: true, data: await repository.setPhoto(actor(req), req.params.id, req.body.version, key) };
  });
  api.post("/api/v1/menu/items/:id/photo/remove", { schema: { ...schema, params, body: VersionBodySchema }, onRequest: mutate("menu.write") }, async req =>
    ({ ok: true, data: await repository.setPhoto(actor(req), req.params.id, req.body.version, null) }));
  api.get("/api/v1/menu/items/:id/photo", { schema: { ...schema, params }, onRequest: authorize("menu.read") }, async (req, reply) => {
    const key = await repository.photoKey(req.params.id);
    if (!key) failure(404, "PHOTO_NOT_FOUND", "Aucune photo pour ce produit.");
    return reply.header("Cache-Control", "private, no-store").type("image/jpeg").send(await photos.read(key));
  });
}
