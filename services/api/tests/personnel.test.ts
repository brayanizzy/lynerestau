import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeeInputSchema, PERMISSIONS } from "@lyne/shared";
import { buildApp } from "../src/application.js";
import { readConfig } from "../src/config.js";
import { hashPassword } from "../src/auth/password.js";
import { checkAccountChange, checkEmployeeFields, checkRoleChange, requireVersion } from "../src/admin/rules.js";
import { normalizePhoto } from "../src/admin/photos.js";
import type { Actor, AdminRepository } from "../src/admin/types.js";
import { MemoryRepository } from "./memory-repository.js";

const password = "Personnel-Test-Only-2026!";
let passwordHash: string;
let auth: MemoryRepository;
let app: Awaited<ReturnType<typeof buildApp>>;
const list = vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 25 }));
const actor: Actor = { id: "owner", authVersion: 1, roleCode: "ADMIN", permissions: [...PERMISSIONS], ipAddress: "127.0.0.1" };
beforeAll(async () => { passwordHash = await hashPassword(password); });
beforeEach(async () => {
  list.mockClear();
  auth = new MemoryRepository();
  auth.users.push({ id: "owner", username: "owner", email: null, displayName: "Test", passwordHash,
    isActive: true, mustChangePassword: false, authVersion: 1, role: { code: "ADMIN", name: "Test" }, permissions: [] });
  app = await buildApp({ repository: auth, adminRepository: { employees: list } as unknown as AdminRepository, config: readConfig({ NODE_ENV: "test" }) });
});
afterEach(async () => { await app.close(); });
async function login() {
  const response = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: { "x-lyne-client": "mobile" }, payload: { identifier: "owner", password } });
  return { authorization: `Bearer ${response.json().data.token}`, "x-lyne-client": "mobile" };
}

describe("administration récupérée", () => {
  it.each([
    ["GET", "/employees"], ["GET", "/employees/demo"], ["GET", "/employees/demo/photo"],
    ["GET", "/employees/demo/card"], ["POST", "/employees"], ["PATCH", "/employees/demo"],
    ["POST", "/employees/demo/archive"], ["POST", "/employees/demo/restore"],
    ["POST", "/employees/demo/photo"], ["POST", "/employees/demo/photo/remove"],
    ["GET", "/personnel-references"], ["POST", "/personnel-references/departments"],
    ["PATCH", "/personnel-references/departments/demo"], ["POST", "/users"],
    ["PATCH", "/users/demo"], ["POST", "/users/demo/reset-password"], ["POST", "/roles"], ["PATCH", "/roles/demo"],
  ] as const)("contrôle les permissions avant les données : %s %s", async (method, path) => {
    const response = await app.inject({ method, url: `/api/v1${path}`, headers: await login(), ...(method === "GET" ? {} : { payload: {} }) });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("FORBIDDEN");
    expect(list).not.toHaveBeenCalled();
  });
  it("autorise uniquement la consultation accordée et refuse une session absente", async () => {
    expect((await app.inject("/api/v1/employees")).statusCode).toBe(401);
    auth.users[0]!.permissions = ["employees.read"];
    const response = await app.inject({ url: "/api/v1/employees", headers: await login() });
    expect(response.statusCode).toBe(200);
    expect(list).toHaveBeenCalledOnce();
  });
  it("refuse les conflits de version et les salaires sans permission", () => {
    expect(() => requireVersion(2, 1)).toThrow("Cette fiche a changé");
    const employee = EmployeeInputSchema.parse({ staffNumber: "LY-1", fullName: "Test", gender: null, phone: null, address: null, hiredAt: null, status: "ACTIVE", notes: null, departmentId: null, jobTitleId: null, salary: "12.50" });
    expect(() => checkEmployeeFields(["employees.write"], employee)).toThrow("Permission salaire requise");
  });
  it("protège le dernier administrateur et interdit l’élévation des droits", () => {
    const target = { id: "other", roleCode: "ADMIN", isActive: true, permissions: [...PERMISSIONS] };
    expect(() => checkAccountChange(actor, target, { ...target, isActive: false }, 1)).toThrow("Conservez au moins un administrateur");
    expect(() => checkAccountChange({ ...actor, roleCode: "MANAGER", permissions: ["users.write"] }, null, { roleCode: "MANAGER", isActive: true, permissions: ["employees.salary"] }, 2)).toThrow("Vous ne pouvez pas attribuer des droits");
    expect(() => checkRoleChange(actor, "ADMIN", [])).toThrow("conserve toutes les permissions");
  });
  it("refuse les faux fichiers image côté serveur", async () => {
    await expect(normalizePhoto(Buffer.from("ceci n’est pas une image").toString("base64"))).rejects.toMatchObject({ code: "INVALID_PHOTO" });
  });
});
