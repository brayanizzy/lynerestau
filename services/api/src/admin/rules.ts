import type { EmployeeInput } from "@lyne/shared";
import type { Actor, AccountAccess } from "./types.js";
import { PERMISSIONS } from "@lyne/shared";
import { failure } from "../errors.js";
export function requireVersion(actual: number, expected: number | undefined) {
    if (actual !== expected)
        failure(409, "VERSION_CONFLICT", "Cette fiche a changé. Actualisez avant de réessayer.");
}
export function checkEmployeeFields(permissions: string[], input: EmployeeInput, previousUserId: string | null = null) {
    if (input.salary !== undefined && !permissions.includes("employees.salary"))
        failure(403, "SALARY_FORBIDDEN", "Permission salaire requise.");
    if (input.userId !== undefined && input.userId !== previousUserId && !permissions.includes("users.write"))
        failure(403, "ACCOUNT_LINK_FORBIDDEN", "Permission de gestion des comptes requise pour cette association.");
}
export function checkAccountChange(actor: Actor, target: AccountAccess | null, next: Omit<AccountAccess, "id">, activeAdmins: number) {
    if ((target?.roleCode === "ADMIN" || next.roleCode === "ADMIN") && actor.roleCode !== "ADMIN")
        failure(403, "OWNER_PROTECTED", "Seul un administrateur peut gérer un compte propriétaire.");
    if (target?.permissions.some(p => !actor.permissions.includes(p)))
        failure(403, "PRIVILEGE_ESCALATION", "Vous ne pouvez pas modifier un compte disposant de droits supérieurs.");
    if (next.permissions.some(p => !actor.permissions.includes(p)))
        failure(403, "PRIVILEGE_ESCALATION", "Vous ne pouvez pas attribuer des droits que vous ne possédez pas.");
    if (target?.id === actor.id && (!next.isActive || next.roleCode !== target.roleCode))
        failure(409, "SELF_LOCKOUT", "Vous ne pouvez pas désactiver ou changer le rôle de votre propre compte.");
    if (target?.roleCode === "ADMIN" && target.isActive && (!next.isActive || next.roleCode !== "ADMIN") && activeAdmins <= 1)
        failure(409, "LAST_ADMIN", "Conservez au moins un administrateur actif.");
}
export function checkRoleChange(actor: Actor, roleCode: string, permissions: string[]) {
    if (actor.roleCode !== "ADMIN")
        failure(403, "OWNER_REQUIRED", "La gestion des rôles est réservée au propriétaire.");
    if (permissions.some(p => !actor.permissions.includes(p)))
        failure(403, "PRIVILEGE_ESCALATION", "Droits non attribuables.");
    if (roleCode === "ADMIN" && (permissions.length !== PERMISSIONS.length || PERMISSIONS.some(p => !permissions.includes(p))))
        failure(409, "OWNER_ROLE_PROTECTED", "Le rôle Administrateur conserve toutes les permissions.");
}
