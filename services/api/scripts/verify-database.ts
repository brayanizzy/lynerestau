import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { readConfig } from "../src/config.js";
import { createDatabase } from "../src/db.js";
import { seed } from "../src/seed.js";
import { createRepository } from "../src/auth/prisma-repository.js";

// Non-destructive smoke check against the initialized database. Audit is retained.
const db = createDatabase();
const repo = createRepository(db);
const app = await buildApp({ repository: repo, config: readConfig({ ...process.env, NODE_ENV: "test" }) });
try {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const before = await db.user.findUniqueOrThrow({ where: { username } });
  const counts = { users: await db.user.count(), roles: await db.role.count(), permissions: await db.permission.count(), grants: await db.rolePermission.count(), audit: await db.auditLog.count() };
  await seed(db);
  const after = await db.user.findUniqueOrThrow({ where: { username } });
  assert.equal(before.passwordHash, after.passwordHash);
  assert.equal(before.updatedAt.getTime(), after.updatedAt.getTime());
  assert.deepEqual(counts, { users: await db.user.count(), roles: await db.role.count(), permissions: await db.permission.count(), grants: await db.rolePermission.count(), audit: await db.auditLog.count() });
  assert.equal((await app.inject("/health")).statusCode, 200);
  const roles = await repo.listRoles();
  assert.equal(roles.length, 4);
  assert.equal(roles.find(r => r.code === "ADMIN")!.permissions.length, 4);
  assert.equal(roles.filter(r => r.code !== "ADMIN").flatMap(r => r.permissions).length, 0);
  const users = await repo.listUsers({ page: 1, pageSize: 10 });
  assert.ok(users.total >= 1);
  assert.ok(!JSON.stringify(users).includes("passwordHash"));
  if (before.mustChangePassword && process.env.SEED_ADMIN_PASSWORD) {
    const response = await app.inject({ method: "POST", url: "/api/v1/auth/login", headers: { "x-lyne-client": "mobile" },
      payload: { identifier: username, password: process.env.SEED_ADMIN_PASSWORD } });
    assert.equal(response.statusCode, 200);
    const headers = { "x-lyne-client": "mobile", authorization: `Bearer ${response.json().data.token}` };
    assert.equal((await app.inject({ url: "/api/v1/auth/me", headers })).statusCode, 200);
    assert.equal((await app.inject({ url: "/api/v1/users", headers })).json().error.code, "PASSWORD_CHANGE_REQUIRED");
    assert.equal((await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers })).statusCode, 200);
    assert.equal((await app.inject({ url: "/api/v1/auth/me", headers })).statusCode, 401);
  }
  console.info("DATABASE_SMOKE_OK : seed idempotent, 4 rôles, permissions, health, session et audit conservé.");
} finally { await app.close(); await db.$disconnect(); }
