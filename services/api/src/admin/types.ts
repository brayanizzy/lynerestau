import type { createAdminRepository } from "./repository.js";
export interface Actor { id: string; authVersion: number; permissions: string[]; roleCode: string; ipAddress: string }
export interface AccountAccess { id: string; roleCode: string; isActive: boolean; permissions: string[] }
export type AdminRepository = ReturnType<typeof createAdminRepository>;
