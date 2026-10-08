import assert from 'node:assert/strict';
import { createDatabase } from './api/db.js';
import { createRepository } from './api/auth/prisma-repository.js';
import { buildApp } from './api/app.js';
import { readConfig } from './api/config.js';
import { seed } from './api/seed.js';
const db = createDatabase();
const repository = createRepository(db);
const app = await buildApp({ repository, config: readConfig({ ...process.env, NODE_ENV: 'test' }) });
try {
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const before = await db.user.findUniqueOrThrow({ where: { username } });
  const counts = async () => [await db.user.count(), await db.role.count(), await db.permission.count(), await db.rolePermission.count(), await db.auditLog.count()];
  const first = await counts();
  assert.equal((await seed(db)).created, false);
  assert.deepEqual(await counts(), first);
  assert.equal((await db.user.findUniqueOrThrow({ where: { username } })).passwordHash, before.passwordHash);
  assert.equal((await app.inject('/health')).statusCode, 200);
  assert.equal((await app.inject('/api/health')).statusCode, 200);
  assert.equal((await repository.listRoles()).length, 4);
  assert.equal((await repository.listRoles()).find(role => role.code === 'ADMIN').permissions.length, 4);
  if (before.mustChangePassword) {
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { 'x-lyne-client': 'mobile' }, payload: { identifier: username, password: process.env.SEED_ADMIN_PASSWORD } });
    assert.equal(login.statusCode, 200);
    const token = login.json().data.token;
    const headers = { 'x-lyne-client': 'mobile', authorization: `Bearer ${token}` };
    assert.equal((await app.inject({ url: '/api/v1/auth/me', headers })).statusCode, 200);
    assert.equal((await app.inject({ url: '/api/v1/users', headers })).json().error.code, 'PASSWORD_CHANGE_REQUIRED');
    assert.equal((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers })).statusCode, 200);
    assert.equal((await app.inject({ url: '/api/v1/auth/me', headers })).statusCode, 401);
  }
  console.info('DATABASE_SMOKE_OK: seed idempotent, roles, health, login, password gate, logout; audit retained.');
} finally { await app.close(); await db.$disconnect(); }
