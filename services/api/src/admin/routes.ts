import type { FastifyInstance, FastifyRequest, onRequestHookHandler } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { Permission } from "@lyne/shared";
import type { AdminRepository, Actor } from "./types.js";
import type { PhotoStore } from "./photos.js";
import { z } from "zod";
import { AccountInputSchema, AccountQuerySchema, AccountUpdateSchema, ArchiveSchema, EmployeeInputSchema, EmployeeQuerySchema, EmployeeUpdateSchema, PhotoInputSchema, RecordIdSchema, ReferenceInputSchema, ReferenceKindSchema, ReferenceUpdateSchema, RoleInputSchema, RoleUpdateSchema, VersionBodySchema } from "@lyne/shared";
import { failure } from "../errors.js";
import { normalizePhoto } from "./photos.js";
import { requireVersion } from "./rules.js";
export function registerAdministration(app: FastifyInstance, repository: AdminRepository, photos: PhotoStore, authorize: (permission: Permission) => onRequestHookHandler, checkMutation: onRequestHookHandler) {
    const api = app.withTypeProvider<ZodTypeProvider>();
    const security: Record<string, string[]>[] = [{ bearerAuth: [] }, { sessionCookie: [] }];
    const schema = { tags: ["Personnel & administration"], security };
    const params = z.object({ id: RecordIdSchema });
    const referenceParams = z.object({ kind: ReferenceKindSchema, id: RecordIdSchema });
    const actor = (req: FastifyRequest): Actor => ({ id: req.auth!.userId, authVersion: req.auth!.user.authVersion,
        permissions: req.auth!.user.permissions, roleCode: req.auth!.user.role.code, ipAddress: req.ip });
    const mutation = (permission: Permission) => [checkMutation, authorize(permission)];
    api.get("/api/v1/employees", { schema: { ...schema, querystring: EmployeeQuerySchema }, onRequest: authorize("employees.read") }, async (req) => ({ ok: true, data: await repository.employees(actor(req), req.query) }));
    api.get("/api/v1/employees/:id", { schema: { ...schema, params }, onRequest: authorize("employees.read") }, async (req) => ({ ok: true, data: await repository.employee(actor(req), req.params.id) }));
    api.post("/api/v1/employees", { schema: { ...schema, body: EmployeeInputSchema }, onRequest: mutation("employees.write") }, async (req, reply) => reply.code(201).send({ ok: true, data: await repository.saveEmployee(actor(req), req.body) }));
    api.patch("/api/v1/employees/:id", { schema: { ...schema, params, body: EmployeeUpdateSchema }, onRequest: mutation("employees.write") }, async (req) => ({ ok: true, data: await repository.saveEmployee(actor(req), req.body, req.params.id) }));
    for (const action of ["archive", "restore"]) {
        api.post(`/api/v1/employees/:id/${action}`, { schema: { ...schema, params, body: ArchiveSchema }, onRequest: mutation("employees.archive") }, async (req) => ({ ok: true, data: await repository.archiveEmployee(actor(req), req.params.id, req.body.version, req.body.reason, action === "restore") }));
    }
    api.post("/api/v1/employees/:id/photo", { schema: { ...schema, params, body: PhotoInputSchema }, bodyLimit: 3 * 1024 * 1024,
        onRequest: mutation("employees.write"), config: { rateLimit: { max: 20, timeWindow: 60000 } } }, async (req) => {
        const current = await repository.employee(actor(req), req.params.id);
        requireVersion(current.version, req.body.version);
        if (current.archivedAt)
            failure(409, "EMPLOYEE_ARCHIVED", "Restaurez la fiche avant de modifier sa photo.");
        const key = await photos.save(await normalizePhoto(req.body.data));
        return { ok: true, data: await repository.setPhoto(actor(req), req.params.id, req.body.version, key) };
    });
    api.post("/api/v1/employees/:id/photo/remove", { schema: { ...schema, params, body: VersionBodySchema }, onRequest: mutation("employees.write") }, async (req) => ({ ok: true, data: await repository.setPhoto(actor(req), req.params.id, req.body.version, null) }));
    api.get("/api/v1/employees/:id/photo", { schema: { ...schema, params }, onRequest: authorize("employees.read") }, async (req, reply) => {
        const key = await repository.photoKey(req.params.id);
        if (!key)
            failure(404, "PHOTO_NOT_FOUND", "Aucune photo pour cette fiche.");
        return reply.header("Cache-Control", "private, no-store").type("image/jpeg").send(await photos.read(key));
    });
    api.get("/api/v1/employees/:id/card", { schema: { ...schema, params }, onRequest: [authorize("employees.read"), authorize("employees.print")] }, async (req) => ({ ok: true, data: await repository.card(actor(req), req.params.id) }));
    api.get("/api/v1/personnel-references", { schema, onRequest: authorize("employees.read") }, async () => ({ ok: true, data: await repository.references() }));
    api.post("/api/v1/personnel-references/:kind", { schema: { ...schema, params: z.object({ kind: ReferenceKindSchema }), body: ReferenceInputSchema }, onRequest: mutation("references.write") }, async (req, reply) => reply.code(201).send({ ok: true, data: await repository.saveReference(actor(req), req.params.kind, req.body) }));
    api.patch("/api/v1/personnel-references/:kind/:id", { schema: { ...schema, params: referenceParams, body: ReferenceUpdateSchema }, onRequest: mutation("references.write") }, async (req) => ({ ok: true, data: await repository.saveReference(actor(req), req.params.kind, req.body, req.params.id) }));
    api.get("/api/v1/users", { schema: { ...schema, querystring: AccountQuerySchema }, onRequest: authorize("users.read") }, async (req) => ({ ok: true, data: await repository.accounts(req.query) }));
    api.post("/api/v1/users", { schema: { ...schema, body: AccountInputSchema }, onRequest: mutation("users.write") }, async (req, reply) => reply.code(201).send({ ok: true, data: await repository.saveAccount(actor(req), req.body) }));
    api.patch("/api/v1/users/:id", { schema: { ...schema, params, body: AccountUpdateSchema }, onRequest: mutation("users.write") }, async (req) => ({ ok: true, data: await repository.saveAccount(actor(req), req.body, req.params.id) }));
    api.post("/api/v1/users/:id/reset-password", { schema: { ...schema, params, body: VersionBodySchema }, onRequest: mutation("users.reset"), config: { rateLimit: {} } }, async (req) => ({ ok: true, data: await repository.resetPassword(actor(req), req.params.id, req.body.version) }));
    api.get("/api/v1/roles", { schema, onRequest: authorize("roles.read") }, async () => ({ ok: true, data: await repository.roles() }));
    api.post("/api/v1/roles", { schema: { ...schema, body: RoleInputSchema }, onRequest: mutation("roles.write") }, async (req, reply) => reply.code(201).send({ ok: true, data: await repository.saveRole(actor(req), req.body) }));
    api.patch("/api/v1/roles/:id", { schema: { ...schema, params, body: RoleUpdateSchema }, onRequest: mutation("roles.write") }, async (req) => ({ ok: true, data: await repository.saveRole(actor(req), req.body, req.params.id) }));
}

