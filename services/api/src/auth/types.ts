import type { Pagination, SessionUser } from "@lyne/shared";

export interface StoredUser extends SessionUser {
  passwordHash: string;
  isActive: boolean;
  authVersion: number;
}
export interface StoredSession {
  id: string;
  tokenHash: string;
  userId: string;
  authVersion: number;
  expiresAt: Date;
  revokedAt: Date | null;
  user: StoredUser;
}
export interface AuditInput {
  userId?: string;
  action: string;
  module: string;
  objectId?: string;
  ipAddress?: string;
  metadata?: Record<string, string | number | boolean>;
}
export interface CreateSessionInput {
  tokenHash: string;
  userId: string;
  authVersion: number;
  expiresAt: Date;
}
export interface AuthRepository {
  ping(): Promise<void>;
  findUser(identifier: string): Promise<StoredUser | null>;
  findSession(tokenHash: string): Promise<StoredSession | null>;
  createSession(session: CreateSessionInput, audit: AuditInput): Promise<void>;
  revokeSession(id: string, now: Date, audit: AuditInput): Promise<void>;
  changePassword(user: StoredUser, passwordHash: string, now: Date, audit: AuditInput): Promise<boolean>;
  audit(entry: AuditInput): Promise<void>;
  listUsers(pagination: Pagination): Promise<{ items: (SessionUser & { isActive: boolean })[]; total: number }>;
  listRoles(): Promise<{ code: string; name: string; permissions: string[] }[]>;
  listPermissions(): Promise<{ code: string; name: string }[]>;
  listAudit(pagination: Pagination): Promise<{ items: unknown[]; total: number }>;
}
export function publicUser(user: StoredUser): SessionUser {
  return { id: user.id, username: user.username, displayName: user.displayName,
    email: user.email, role: user.role, permissions: user.permissions,
    mustChangePassword: user.mustChangePassword };
}
