import { z } from "zod";

/**
 * PHASE 0 — Fondations.
 * Contenu volontairement générique (infrastructure transversale), sans logique métier.
 * Les types métier (commandes, stock, finance…) seront ajoutés phase par phase.
 */

/** Version technique partagée par tous les consumers. */
export const SHARED_PHASE = "2";

/** Identifiant stable universel (clé primaire des tables métier, cf. spec §7). */
export const IdSchema = z.string().min(1);

/** Identifiant typé par Zod. */
export type Id = z.infer<typeof IdSchema>;

/** Devise d'affichage par défaut (RG-10) : USD, configurable via paramètres. */
export const DEFAULT_CURRENCY = "USD";

/** Enveloppe de réussite générique des endpoints API. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** Enveloppe d'erreur générique des endpoints API. */
export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Statut technique de la plateforme (endpoint d'exploitation, cf. Phase 1). */
export const PLATFORM_NAME = "lyne-restaurant";

export const LoginSchema = z.strictObject({
  identifier: z.string().trim().toLowerCase().min(1).max(191),
  password: z.string().min(1).max(128),
});
export const NewPasswordSchema = z.string().min(12).max(128);
export const ChangePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(128),
  newPassword: NewPasswordSchema,
});
export { PaginationSchema } from "./pagination.js";
export type { Pagination } from "./pagination.js";
export const PERMISSIONS = ["users.read", "roles.read", "permissions.read", "audit.read", "users.write", "users.reset", "roles.write", "employees.read", "employees.write", "employees.archive", "employees.salary", "employees.print", "references.write"] as const;
export type Permission = typeof PERMISSIONS[number];
export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: { code: string; name: string };
  permissions: string[];
  mustChangePassword: boolean;
}
export interface AuthSession {
  user: SessionUser;
  expiresAt: string;
  /** Present only for native clients; never stored in browser localStorage. */
  token?: string;
}
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }

export * from "./personnel.js";
