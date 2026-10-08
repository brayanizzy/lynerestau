import type { Pagination } from "@lyne/shared";
import type { PrismaClient, Prisma } from "../generated/prisma/client.js";
import { publicUser, type AuditInput, type AuthRepository, type StoredUser } from "./types.js";

const userInclude = { role: { include: { permissions: { include: { permission: true } } } } } as const;
type DatabaseUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;
function mapUser(user: DatabaseUser): StoredUser {
  return { id: user.id, username: user.username, email: user.email, displayName: user.displayName,
    passwordHash: user.passwordHash, isActive: user.isActive, authVersion: user.authVersion,
    mustChangePassword: user.mustChangePassword, role: { code: user.role.code, name: user.role.name },
    permissions: user.role.permissions.map(p => p.permission.code).sort() };
}
const auditData = (entry: AuditInput) => ({ ...entry });
export function createRepository(db: PrismaClient): AuthRepository {
  return {
    async ping() { await db.$queryRaw`SELECT 1`; },
    async findUser(identifier) {
      const user = await db.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] }, include: userInclude });
      return user ? mapUser(user) : null;
    },
    async findSession(tokenHash) {
      const session = await db.session.findUnique({ where: { tokenHash }, include: { user: { include: userInclude } } });
      return session ? { ...session, user: mapUser(session.user) } : null;
    },
    async createSession(session, audit) {
      await db.$transaction([db.session.create({ data: session }), db.auditLog.create({ data: auditData(audit) })]);
    },
    async revokeSession(id, now, audit) {
      await db.$transaction(async tx => {
        const result = await tx.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: now } });
        if (result.count) await tx.auditLog.create({ data: auditData(audit) });
      });
    },
    async changePassword(user, passwordHash, now, audit) {
      return db.$transaction(async tx => {
        const changed = await tx.user.updateMany({ where: { id: user.id, passwordHash: user.passwordHash, isActive: true, authVersion: user.authVersion },
          data: { passwordHash, mustChangePassword: false, authVersion: { increment: 1 }, version: { increment: 1 } } });
        if (changed.count !== 1) return false;
        await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
        await tx.auditLog.create({ data: auditData(audit) });
        return true;
      });
    },
    async audit(entry) { await db.auditLog.create({ data: auditData(entry) }); },
    async listUsers({ page, pageSize }: Pagination) {
      const [users, total] = await db.$transaction([
        db.user.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { username: "asc" }, include: userInclude }), db.user.count(),
      ]);
      return { items: users.map(u => ({ ...publicUser(mapUser(u)), isActive: u.isActive })), total };
    },
    async listRoles() {
      return (await db.role.findMany({ include: userInclude.role.include, orderBy: { code: "asc" } }))
        .map(r => ({ code: r.code, name: r.name, permissions: r.permissions.map(p => p.permission.code).sort() }));
    },
    async listPermissions() { return db.permission.findMany({ select: { code: true, name: true }, orderBy: { code: "asc" } }); },
    async listAudit({ page, pageSize }) {
      const [items, total] = await db.$transaction([
        db.auditLog.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: { user: { select: { username: true, displayName: true } } } }), db.auditLog.count(),
      ]);
      return { items, total };
    },
  };
}
