import type { Account, AccountInput, AccountUpdate, AccountQuery, Employee, EmployeeInput, EmployeeUpdate, EmployeeQuery, ReferenceInput, ReferenceKind, Role, RoleInput, RoleUpdate, StaffCard } from "@lyne/shared";
import type { PrismaClient, Prisma } from "../generated/prisma/client.js";
import type { Actor } from "./types.js";
import { randomBytes } from "node:crypto";
import { failure } from "../errors.js";
import { hashPassword } from "../auth/password.js";
import { checkAccountChange, checkEmployeeFields, checkRoleChange, requireVersion } from "./rules.js";
const employeeInclude = { department: true, jobTitle: true, user: { select: { id: true, username: true, isActive: true } } } as const;
const accountInclude = { role: { include: { permissions: { include: { permission: true } } } }, employee: { select: { id: true, fullName: true, staffNumber: true } } } as const;
const roleInclude = { permissions: { include: { permission: true } }, _count: { select: { users: true } } } as const;
const referenceView = (row: { id: string; name: string; isActive: boolean; version: number }) => ({ id: row.id, name: row.name, isActive: row.isActive, version: row.version });
function employeeView(row: Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>, actor: Actor): Employee {
    return { id: row.id, staffNumber: row.staffNumber, fullName: row.fullName, gender: row.gender as Employee["gender"],
        phone: row.phone, address: row.address, hiredAt: row.hiredAt?.toISOString().slice(0, 10) ?? null, status: row.status as Employee["status"],
        ...(actor.permissions.includes("employees.salary") ? { salary: row.salary?.toFixed(2) ?? null } : {}), notes: row.notes,
        departmentId: row.departmentId, jobTitleId: row.jobTitleId, userId: row.userId,
        department: row.department ? referenceView(row.department) : null, jobTitle: row.jobTitle ? referenceView(row.jobTitle) : null, user: row.user,
        photoUrl: row.photoKey ? `/api/v1/employees/${row.id}/photo?v=${row.version}` : null,
        archivedAt: row.archivedAt?.toISOString() ?? null, archiveReason: row.archiveReason, version: row.version,
        createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
function accountView(row: Prisma.UserGetPayload<{ include: typeof accountInclude }>): Account {
    return { id: row.id, username: row.username, email: row.email, displayName: row.displayName, isActive: row.isActive,
        mustChangePassword: row.mustChangePassword, version: row.version, role: { code: row.role.code, name: row.role.name }, employee: row.employee };
}
function roleView(row: Prisma.RoleGetPayload<{ include: typeof roleInclude }>): Role {
    return { id: row.id, code: row.code, name: row.name, version: row.version, permissions: row.permissions.map(p => p.permission.code).sort(), userCount: row._count.users };
}
function audit(tx: PrismaClient | Prisma.TransactionClient, actor: Actor, action: string, objectId: string, metadata: Prisma.InputJsonObject = {}) {
    return tx.auditLog.create({ data: { userId: actor.id, ipAddress: actor.ipAddress, module: "personnel", action, objectId, metadata } });
}
// Serialize access mutations on the immutable owner role. Recheck the actor inside
// the transaction so a just-revoked session cannot complete a queued mutation.
export async function authorizeWrite(tx: Prisma.TransactionClient, actor: Actor, permission: string) {
    await tx.$queryRaw `SELECT id FROM roles WHERE code = 'ADMIN' FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: actor.id }, include: accountInclude });
    if (!current?.isActive || current.authVersion !== actor.authVersion)
        failure(401, "SESSION_CHANGED", "Session modifiée. Reconnectez-vous.");
    if (current.mustChangePassword)
        failure(403, "PASSWORD_CHANGE_REQUIRED", "Changez votre mot de passe initial pour continuer.");
    const fresh = { ...actor, roleCode: current.role.code, permissions: current.role.permissions.map(p => p.permission.code) };
    if (!fresh.permissions.includes(permission))
        failure(403, "FORBIDDEN", "Permission insuffisante.");
    return fresh;
}
async function findEmployee(tx: PrismaClient | Prisma.TransactionClient, id: string) {
    const row = await tx.employee.findUnique({ where: { id }, include: employeeInclude });
    if (!row)
        failure(404, "EMPLOYEE_NOT_FOUND", "Fiche introuvable.");
    return row;
}
async function validateLinks(tx: Prisma.TransactionClient, input: EmployeeInput, previous?: Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>) {
    for (const [kind, id, old] of [["department", input.departmentId, previous?.departmentId], ["jobTitle", input.jobTitleId, previous?.jobTitleId]]) {
        if (!id)
            continue;
        const item = kind === "department" ? await tx.department.findUnique({ where: { id } }) : await tx.jobTitle.findUnique({ where: { id } });
        if (!item || (!item.isActive && id !== old))
            failure(400, "INVALID_REFERENCE", "Sélectionnez une fonction et un service actifs.");
    }
    if (input.userId && !await tx.user.findUnique({ where: { id: input.userId }, select: { id: true } }))
        failure(400, "INVALID_ACCOUNT", "Compte utilisateur introuvable.");
}
function employeeData(input: EmployeeInput) {
    return { staffNumber: input.staffNumber, fullName: input.fullName, gender: input.gender, phone: input.phone,
        address: input.address, hiredAt: input.hiredAt ? new Date(`${input.hiredAt}T00:00:00.000Z`) : null,
        status: input.status, ...(input.salary !== undefined ? { salary: input.salary } : {}), notes: input.notes,
        departmentId: input.departmentId, jobTitleId: input.jobTitleId, ...(input.userId !== undefined ? { userId: input.userId } : {}) };
}
export function createAdminRepository(db: PrismaClient) {
    async function write<T>(action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        try {
            return await db.$transaction(action, { maxWait: 10000, timeout: 15000 });
        }
        catch (error) {
            const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
            if (code === "P2002")
                failure(409, "ALREADY_EXISTS", "Matricule, nom, identifiant, e-mail ou compte associé déjà utilisé.");
            if (code === "P2003")
                failure(409, "REFERENCE_CONFLICT", "Une référence a changé. Actualisez la fiche.");
            if (code === "P2034")
                failure(409, "CONCURRENT_CHANGE", "Une autre opération est en cours. Réessayez.");
            throw error;
        }
    }
    return {
        async employees(actor: Actor, query: EmployeeQuery) {
            const where = {
                ...(query.archive === "current" ? { archivedAt: null } : query.archive === "archived" ? { archivedAt: { not: null } } : {}),
                ...(query.search ? { OR: [{ fullName: { contains: query.search } }, { staffNumber: { contains: query.search } }] } : {}),
                ...(query.status ? { status: query.status } : {}), ...(query.departmentId ? { departmentId: query.departmentId } : {}),
            };
            const [items, total] = await db.$transaction([db.employee.findMany({ where, include: employeeInclude, orderBy: [{ fullName: "asc" }, { id: "asc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), db.employee.count({ where })]);
            return { items: items.map(row => employeeView(row, actor)), total, page: query.page, pageSize: query.pageSize };
        },
        async employee(actor: Actor, id: string) { return employeeView(await findEmployee(db, id), actor); },
        async saveEmployee(actor: Actor, input: EmployeeInput | EmployeeUpdate, id?: string) {
            return write(async (tx) => {
                const fresh = await authorizeWrite(tx, actor, "employees.write");
                const previous = id ? await findEmployee(tx, id) : undefined;
                if (previous) {
                    requireVersion(previous.version, "version" in input ? input.version : undefined);
                    if (previous.archivedAt)
                        failure(409, "EMPLOYEE_ARCHIVED", "Restaurez la fiche avant de la modifier.");
                }
                checkEmployeeFields(fresh.permissions, input, previous?.userId);
                await validateLinks(tx, input, previous);
                const row = id ? await tx.employee.update({ where: { id }, data: { ...employeeData(input), version: { increment: 1 } }, include: employeeInclude }) :
                    await tx.employee.create({ data: employeeData(input), include: employeeInclude });
                const changed = previous ? (Object.keys(employeeData(input)) as (keyof EmployeeInput)[]).filter(key => key === "hiredAt" ? input.hiredAt !== previous.hiredAt?.toISOString().slice(0, 10) : String(input[key] ?? "") !== String(previous[key] ?? "")) : Object.keys(employeeData(input));
                // Sensitive contacts/salary/photos are never duplicated into broadly readable audit metadata.
                await audit(tx, fresh, id ? "employee.updated" : "employee.created", row.id, { fields: changed.join(","), previousStatus: previous?.status ?? null, status: row.status, previousUserId: previous?.userId ?? null, userId: row.userId, version: row.version });
                return employeeView(row, fresh);
            });
        },
        async archiveEmployee(actor: Actor, id: string, version: number, reason: string, restore: boolean) {
            return write(async (tx) => {
                const fresh = await authorizeWrite(tx, actor, "employees.archive");
                const previous = await findEmployee(tx, id);
                requireVersion(previous.version, version);
                if (Boolean(previous.archivedAt) !== restore)
                    failure(409, "ARCHIVE_STATE", restore ? "Cette fiche n’est pas archivée." : "Cette fiche est déjà archivée.");
                const row = await tx.employee.update({ where: { id }, data: { archivedAt: restore ? null : new Date(), archiveReason: restore ? null : reason, version: { increment: 1 } }, include: employeeInclude });
                await audit(tx, fresh, restore ? "employee.restored" : "employee.archived", id, { reason, accountUnchanged: true });
                return employeeView(row, fresh);
            });
        },
        async setPhoto(actor: Actor, id: string, version: number, key: string | null) {
            return write(async (tx) => {
                const fresh = await authorizeWrite(tx, actor, "employees.write");
                const previous = await findEmployee(tx, id);
                requireVersion(previous.version, version);
                if (previous.archivedAt)
                    failure(409, "EMPLOYEE_ARCHIVED", "Restaurez la fiche avant de modifier sa photo.");
                const row = await tx.employee.update({ where: { id }, data: { photoKey: key, version: { increment: 1 } }, include: employeeInclude });
                await audit(tx, fresh, key ? "employee.photo.updated" : "employee.photo.detached", id);
                return employeeView(row, fresh);
            });
        },
        async photoKey(id: string) { return (await findEmployee(db, id)).photoKey; },
        async card(actor: Actor, id: string): Promise<StaffCard> {
            const row = await findEmployee(db, id);
            if (row.archivedAt || row.status !== "ACTIVE")
                failure(409, "CARD_INACTIVE", "La carte de service est réservée aux employés actifs et non archivés.");
            await audit(db, actor, "employee.card.generated", id);
            return { id, staffNumber: row.staffNumber, fullName: row.fullName, jobTitle: row.jobTitle?.name ?? null, department: row.department?.name ?? null,
                photoUrl: row.photoKey ? `/api/v1/employees/${id}/photo?v=${row.version}` : null, status: row.status, archived: false };
        },
        async references() {
            const [departments, jobTitles] = await db.$transaction([db.department.findMany({ orderBy: { name: "asc" } }), db.jobTitle.findMany({ orderBy: { name: "asc" } })]);
            return { departments: departments.map(referenceView), jobTitles: jobTitles.map(referenceView) };
        },
        async saveReference(actor: Actor, kind: ReferenceKind, input: ReferenceInput & { version?: number }, id?: string) {
            return write(async (tx) => {
                const fresh = await authorizeWrite(tx, actor, "references.write");
                const previous = id ? kind === "departments" ? await tx.department.findUnique({ where: { id } }) : await tx.jobTitle.findUnique({ where: { id } }) : null;
                if (id && !previous)
                    failure(404, "REFERENCE_NOT_FOUND", "Référence introuvable.");
                if (previous)
                    requireVersion(previous.version, input.version);
                const data = { name: input.name, isActive: input.isActive };
                const row = kind === "departments" ? (id ? await tx.department.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await tx.department.create({ data })) :
                    (id ? await tx.jobTitle.update({ where: { id }, data: { ...data, version: { increment: 1 } } }) : await tx.jobTitle.create({ data }));
                await audit(tx, fresh, id ? "reference.updated" : "reference.created", row.id, { kind, previousName: previous?.name ?? null, name: row.name, previousActive: previous?.isActive ?? null, isActive: row.isActive });
                return referenceView(row);
            });
        },
        async accounts(query: AccountQuery) {
            const where = query.search ? { OR: [{ username: { contains: query.search } }, { displayName: { contains: query.search } }, { email: { contains: query.search } }] } : {};
            const [rows, total] = await db.$transaction([db.user.findMany({ where, include: accountInclude, orderBy: { username: "asc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }), db.user.count({ where })]);
            return { items: rows.map(accountView), total, page: query.page, pageSize: query.pageSize };
        },
        async saveAccount(actor: Actor, input: AccountInput | AccountUpdate, id?: string) {
            const initialPassword = id ? undefined : randomBytes(18).toString("base64url");
            const passwordHash = initialPassword ? await hashPassword(initialPassword) : undefined;
            return write(async (tx) => {
                const fresh = await authorizeWrite(tx, actor, "users.write");
                const previous = id ? await tx.user.findUnique({ where: { id }, include: accountInclude }) : null;
                if (id && !previous)
                    failure(404, "ACCOUNT_NOT_FOUND", "Compte introuvable.");
                if (previous)
                    requireVersion(previous.version, "version" in input ? input.version : undefined);
                const role = await tx.role.findUnique({ where: { code: input.roleCode }, include: roleInclude });
                if (!role)
                    failure(400, "INVALID_ROLE", "Rôle introuvable.");
                const activeAdmins = await tx.user.count({ where: { isActive: true, role: { code: "ADMIN" } } });
                checkAccountChange(fresh, previous ? { id: previous.id, roleCode: previous.role.code, isActive: previous.isActive, permissions: previous.role.permissions.map(p => p.permission.code) } : null, { roleCode: role.code, isActive: input.isActive, permissions: role.permissions.map(p => p.permission.code) }, activeAdmins);
                const data = { username: input.username, email: input.email, displayName: input.displayName, roleId: role.id, isActive: input.isActive };
                const changedAccess = previous && (previous.isActive !== input.isActive || previous.roleId !== role.id || previous.username !== input.username);
                const row = id ? await tx.user.update({ where: { id }, data: { ...data, version: { increment: 1 }, ...(changedAccess ? { authVersion: { increment: 1 } } : {}) }, include: accountInclude }) :
                    await tx.user.create({ data: { ...data, passwordHash: passwordHash!, mustChangePassword: true }, include: accountInclude });
                if (changedAccess)
                    await tx.session.updateMany({ where: { userId: row.id, revokedAt: null }, data: { revokedAt: new Date() } });
                await audit(tx, fresh, id ? "account.updated" : "account.created", row.id, { previousRole: previous?.role.code ?? null, role: role.code, previousActive: previous?.isActive ?? null, isActive: row.isActive, sessionsRevoked: Boolean(changedAccess) });
                return { account: accountView(row), ...(initialPassword ? { initialPassword } : {}) };
            });
        },
        async resetPassword(actor: Actor, id: string, version: number) {
            const initialPassword = randomBytes(18).toString("base64url");
            const passwordHash = await hashPassword(initialPassword);
            return write(async (tx) => {
                const fresh = await authorizeWrite(tx, actor, "users.reset");
                const target = await tx.user.findUnique({ where: { id }, include: accountInclude });
                if (!target)
                    failure(404, "ACCOUNT_NOT_FOUND", "Compte introuvable.");
                requireVersion(target.version, version);
                if (target.id === actor.id)
                    failure(409, "SELF_RESET", "Utilisez Changer mon mot de passe pour votre propre compte.");
                if (target.role.code === "ADMIN" && fresh.roleCode !== "ADMIN")
                    failure(403, "OWNER_PROTECTED", "Compte propriétaire protégé.");
                if (target.role.permissions.some(p => !fresh.permissions.includes(p.permission.code)))
                    failure(403, "PRIVILEGE_ESCALATION", "Vous ne pouvez pas réinitialiser un compte disposant de droits supérieurs.");
                await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true, authVersion: { increment: 1 }, version: { increment: 1 } } });
                await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
                await audit(tx, fresh, "account.password.reset", id);
                return { initialPassword };
            });
        },
        async roles() { return (await db.role.findMany({ include: roleInclude, orderBy: { code: "asc" } })).map(roleView); },
        async saveRole(actor: Actor, input: RoleInput | RoleUpdate, id?: string) {
            return write(async (tx) => {
                const fresh = await authorizeWrite(tx, actor, "roles.write");
                const previous = id ? await tx.role.findUnique({ where: { id }, include: roleInclude }) : null;
                if (id && !previous)
                    failure(404, "ROLE_NOT_FOUND", "Rôle introuvable.");
                if (previous) {
                    requireVersion(previous.version, "version" in input ? input.version : undefined);
                    if (input.code !== previous.code)
                        failure(400, "ROLE_CODE_IMMUTABLE", "Le code d’un rôle existant ne peut pas changer.");
                }
                checkRoleChange(fresh, input.code, input.permissions);
                const permissions = await tx.permission.findMany({ where: { code: { in: input.permissions } } });
                if (permissions.length !== input.permissions.length)
                    failure(400, "INVALID_PERMISSION", "Permission inconnue.");
                const row = previous ? await tx.role.update({ where: { id }, data: { name: input.name, version: { increment: 1 } } }) : await tx.role.create({ data: { code: input.code, name: input.name } });
                const beforeCodes = previous?.permissions.map(p => p.permission.code).sort() ?? [];
                // Permission associations are configuration; their prior/new values are retained in audit.
                await tx.rolePermission.deleteMany({ where: { roleId: row.id, permissionId: { notIn: permissions.map(p => p.id) } } });
                for (const permission of permissions)
                    await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: row.id, permissionId: permission.id } }, create: { roleId: row.id, permissionId: permission.id }, update: {} });
                if (previous && beforeCodes.join() !== [...input.permissions].sort().join()) {
                    await tx.user.updateMany({ where: { roleId: row.id }, data: { authVersion: { increment: 1 }, version: { increment: 1 } } });
                    await tx.session.updateMany({ where: { user: { roleId: row.id }, revokedAt: null }, data: { revokedAt: new Date() } });
                }
                await audit(tx, fresh, id ? "role.updated" : "role.created", row.id, { code: row.code, before: beforeCodes.join(","), after: [...input.permissions].sort().join(",") });
                return roleView(await tx.role.findUniqueOrThrow({ where: { id: row.id }, include: roleInclude }));
            });
        },
    };
}
