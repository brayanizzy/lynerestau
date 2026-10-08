import { randomUUID } from "node:crypto";
import type { Pagination } from "@lyne/shared";
import { publicUser, type AuditInput, type AuthRepository, type CreateSessionInput, type StoredSession, type StoredUser } from "../src/auth/types.js";

/** Test double only. Production always uses Prisma. */
export class MemoryRepository implements AuthRepository {
  users: StoredUser[] = [];
  sessions: StoredSession[] = [];
  events: AuditInput[] = [];
  available = true;
  async ping() { if (!this.available) throw new Error("DB private error"); }
  async findUser(identifier: string) { return this.users.find(u => u.username === identifier || u.email === identifier) ?? null; }
  async findSession(hash: string) {
    const session = this.sessions.find(s => s.tokenHash === hash);
    if (!session) return null;
    return { ...session, user: this.users.find(u => u.id === session.userId)! };
  }
  async createSession(input: CreateSessionInput, audit: AuditInput) {
    this.sessions.push({ ...input, id: randomUUID(), revokedAt: null, user: this.users.find(u => u.id === input.userId)! });
    this.events.push(audit);
  }
  async revokeSession(id: string, now: Date, audit: AuditInput) {
    const session = this.sessions.find(s => s.id === id);
    if (session && !session.revokedAt) { session.revokedAt = now; this.events.push(audit); }
  }
  async changePassword(user: StoredUser, passwordHash: string, now: Date, audit: AuditInput) {
    const current = this.users.find(u => u.id === user.id && u.authVersion === user.authVersion && u.passwordHash === user.passwordHash && u.isActive);
    if (!current) return false;
    const index = this.users.indexOf(current);
    this.users[index] = { ...current, passwordHash, authVersion: current.authVersion + 1, mustChangePassword: false };
    for (const session of this.sessions) if (session.userId === user.id && !session.revokedAt) session.revokedAt = now;
    this.events.push(audit);
    return true;
  }
  async audit(entry: AuditInput) { this.events.push(entry); }
  async listUsers({ page, pageSize }: Pagination) {
    return { items: this.users.slice((page - 1) * pageSize, page * pageSize).map(u => ({ ...publicUser(u), isActive: u.isActive })), total: this.users.length };
  }
  async listRoles() { return [{ code: "ADMIN", name: "Administrateur", permissions: ["users.read", "roles.read", "permissions.read", "audit.read"] }]; }
  async listPermissions() { return [{ code: "users.read", name: "Consulter les comptes" }]; }
  async listAudit({ page, pageSize }: Pagination) { return { items: this.events.slice((page - 1) * pageSize, page * pageSize), total: this.events.length }; }
}
