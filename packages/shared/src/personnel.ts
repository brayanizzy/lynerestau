import { z } from "zod";
import { PaginationSchema } from "./pagination.js";
export const PERMISSION_LABELS = {
    "users.read": "Consulter les comptes", "users.write": "Créer et gérer les comptes",
    "users.reset": "Réinitialiser les mots de passe", "roles.read": "Consulter les rôles",
    "roles.write": "Gérer les rôles et permissions", "permissions.read": "Permissions et documentation API",
    "audit.read": "Consulter le journal d’audit", "employees.read": "Consulter le personnel",
    "employees.write": "Créer et modifier les fiches", "employees.archive": "Archiver et restaurer les fiches",
    "employees.salary": "Consulter et modifier les salaires", "employees.print": "Imprimer les cartes de service",
    "references.write": "Gérer les fonctions et services",
    "menu.read": "Consulter le menu et les prix", "menu.write": "Gérer le catalogue et les prix",
    "menu.availability": "Changer la disponibilité des produits",
};
export const EmployeeStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]);
export const EMPLOYEE_STATUS_LABELS = { ACTIVE: "Actif", INACTIVE: "Inactif", ON_LEAVE: "En congé" };
const nullableText = (max: number) => z.string().trim().max(max).transform(value => value || null).nullable();
export const RecordIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,30}$/);
export const VersionSchema = z.number().int().positive();
export const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= "2100-12-31";
}, "Date invalide");
export const SalarySchema = z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Montant USD invalide").nullable();
export const EmployeeInputSchema = z.strictObject({
    staffNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{0,29}$/),
    fullName: z.string().trim().min(2).max(150),
    gender: z.enum(["FEMALE", "MALE", "OTHER"]).nullable(),
    phone: nullableText(40), address: nullableText(500), hiredAt: DateOnlySchema.nullable(),
    status: EmployeeStatusSchema, salary: SalarySchema.optional(), notes: nullableText(2000),
    departmentId: RecordIdSchema.nullable(), jobTitleId: RecordIdSchema.nullable(),
    userId: RecordIdSchema.nullable().optional(),
});
export const EmployeeUpdateSchema = EmployeeInputSchema.extend({ version: VersionSchema });
export const EmployeeQuerySchema = PaginationSchema.extend({
    search: z.string().trim().max(100).default(""), status: EmployeeStatusSchema.optional(),
    departmentId: RecordIdSchema.optional(), archive: z.enum(["current", "archived", "all"]).default("current"),
});
export const ArchiveSchema = z.strictObject({ version: VersionSchema, reason: z.string().trim().min(3).max(500) });
export const VersionBodySchema = z.strictObject({ version: VersionSchema });
export const ReferenceInputSchema = z.strictObject({ name: z.string().trim().min(2).max(100), isActive: z.boolean() });
export const ReferenceUpdateSchema = ReferenceInputSchema.extend({ version: VersionSchema });
export const ReferenceKindSchema = z.enum(["departments", "job-titles"]);
export const UsernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,100}$/);
export const AccountInputSchema = z.strictObject({
    username: UsernameSchema, email: z.email().max(191).toLowerCase().nullable(), displayName: z.string().trim().min(2).max(150),
    roleCode: z.string().regex(/^[A-Z][A-Z0-9_]{1,49}$/), isActive: z.boolean(),
});
export const AccountUpdateSchema = AccountInputSchema.extend({ version: VersionSchema });
export const AccountQuerySchema = PaginationSchema.extend({ search: z.string().trim().max(100).default("") });
export const RoleInputSchema = z.strictObject({ code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,49}$/),
    name: z.string().trim().min(2).max(100), permissions: z.array(z.enum(Object.keys(PERMISSION_LABELS) as [keyof typeof PERMISSION_LABELS, ...(keyof typeof PERMISSION_LABELS)[]])).max(30)
        .refine(values => new Set(values).size === values.length, "Permissions en double") });
export const RoleUpdateSchema = RoleInputSchema.extend({ version: VersionSchema });
export const PhotoInputSchema = z.strictObject({ version: VersionSchema, data: z.string().min(4).max(2796204).regex(/^[A-Za-z0-9+/]*={0,2}$/).refine(value => value.length % 4 === 0, "Base64 invalide") });

export type EmployeeInput = z.infer<typeof EmployeeInputSchema>;
export type EmployeeUpdate = z.infer<typeof EmployeeUpdateSchema>;
export type EmployeeQuery = z.infer<typeof EmployeeQuerySchema>;
export type AccountInput = z.infer<typeof AccountInputSchema>;
export type AccountUpdate = z.infer<typeof AccountUpdateSchema>;
export type AccountQuery = z.infer<typeof AccountQuerySchema>;
export type RoleInput = z.infer<typeof RoleInputSchema>;
export type RoleUpdate = z.infer<typeof RoleUpdateSchema>;
export type ReferenceInput = z.infer<typeof ReferenceInputSchema>;
export type ReferenceKind = z.infer<typeof ReferenceKindSchema>;
export interface Reference {
    id: string;
    name: string;
    isActive: boolean;
    version: number;
}
export interface Employee extends Omit<EmployeeInput, "userId" | "departmentId" | "jobTitleId"> {
    id: string;
    version: number;
    departmentId: string | null;
    jobTitleId: string | null;
    userId: string | null;
    department: Reference | null;
    jobTitle: Reference | null;
    user: {
        id: string;
        username: string;
        isActive: boolean;
    } | null;
    photoUrl: string | null;
    archivedAt: string | null;
    archiveReason: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface Account {
    id: string;
    username: string;
    email: string | null;
    displayName: string;
    isActive: boolean;
    mustChangePassword: boolean;
    version: number;
    role: {
        code: string;
        name: string;
    };
    employee: {
        id: string;
        fullName: string;
        staffNumber: string;
    } | null;
}
export interface Role {
    id: string;
    code: string;
    name: string;
    version: number;
    permissions: string[];
    userCount: number;
}
export interface StaffCard {
    id: string;
    staffNumber: string;
    fullName: string;
    jobTitle: string | null;
    department: string | null;
    photoUrl: string | null;
    status: EmployeeInput["status"];
    archived: boolean;
}
