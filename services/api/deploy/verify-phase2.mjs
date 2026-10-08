import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createDatabase } from './api/db.js';
import { createRepository } from './api/auth/prisma-repository.js';
import { createAdminRepository } from './api/admin/repository.js';
import { buildApp } from './api/application.js';
import { readConfig } from './api/config.js';
import { hashPassword, tokenHash, verifyPassword } from './api/auth/password.js';
import { PERMISSIONS } from '@lyne/shared';

// Integration checks use the real schema and repository in ONE rolled-back
// transaction. Never alter the real administrator or leave demo data behind.
const db = createDatabase();
const marker = `qa${randomBytes(5).toString('hex')}`;
const rollback = new Error('EXPECTED_TEST_ROLLBACK');
let completed = false;
const before = await db.user.findUnique({ where: { username: process.env.SEED_ADMIN_USERNAME || 'admin' }, select: { id: true, passwordHash: true, authVersion: true, isActive: true } });
try {
  try {
    await db.$transaction(async tx => {
      const adapter = new Proxy(tx, { get(target, key) {
        if (key === '$transaction') return async action => typeof action === 'function' ? action(target) : Promise.all(action);
        return target[key];
      } });
      const role = await tx.role.findUniqueOrThrow({ where: { code: 'ADMIN' }, include: { permissions: { include: { permission: true } } } });
      assert.deepEqual(role.permissions.map(p => p.permission.code).sort(), [...PERMISSIONS].sort());
      const password = `${marker}-Integration-Only!`;
      const owner = await tx.user.create({ data: { username: marker, displayName: 'Transaction test only', roleId: role.id, passwordHash: await hashPassword(password), mustChangePassword: false } });
      const actor = { id: owner.id, authVersion: owner.authVersion, roleCode: 'ADMIN', permissions: [...PERMISSIONS] };
      const repository = createAdminRepository(adapter);
      const authRepository = createRepository(adapter);
      const app = await buildApp({ repository: authRepository, adminRepository: repository, config: readConfig({ NODE_ENV: 'test' }) });
      try {
        const department = await repository.saveReference(actor, 'departments', { name: marker, isActive: true });
        const title = await repository.saveReference(actor, 'job-titles', { name: marker, isActive: true });
        const custom = await repository.saveRole(actor, { code: marker.toUpperCase(), name: marker, permissions: ['employees.read', 'employees.write'] });
        const account = await repository.saveAccount(actor, { username: `${marker}user`, email: null, displayName: marker, roleCode: custom.code, isActive: true });
        assert.ok(account.initialPassword.length >= 12); assert.equal(account.account.mustChangePassword, true);
        assert.equal(await verifyPassword((await tx.user.findUniqueOrThrow({ where: { id: account.account.id } })).passwordHash, account.initialPassword), true);
        const input = { staffNumber: marker.toUpperCase(), fullName: marker, gender: null, phone: null, address: null, hiredAt: '2026-09-28', status: 'ACTIVE', salary: '123.45', notes: null, departmentId: department.id, jobTitleId: title.id, userId: account.account.id };
        let employee = await repository.saveEmployee(actor, input);
        assert.equal(employee.salary, '123.45'); assert.equal(employee.hiredAt, '2026-09-28');
        await assert.rejects(() => repository.saveEmployee(actor, input), { code: 'ALREADY_EXISTS' });
        await assert.rejects(() => repository.saveEmployee(actor, { ...input, staffNumber: `${marker}2`.toUpperCase() }), { code: 'ALREADY_EXISTS' });
        const low = await tx.user.update({ where: { id: account.account.id }, data: { mustChangePassword: false } });
        const lowActor = { id: low.id, authVersion: low.authVersion, roleCode: custom.code, permissions: ['employees.read', 'employees.write'] };
        assert.equal('salary' in await repository.employee(lowActor, employee.id), false);
        await assert.rejects(() => repository.saveEmployee(lowActor, { ...input, salary: null, version: employee.version }, employee.id), { code: 'SALARY_FORBIDDEN' });
        employee = await repository.saveEmployee(actor, { ...input, status: 'ON_LEAVE', version: employee.version }, employee.id);
        await assert.rejects(() => repository.saveEmployee(actor, { ...input, version: 1 }, employee.id), { code: 'VERSION_CONFLICT' });
        await assert.rejects(() => repository.card(actor, employee.id), { code: 'CARD_INACTIVE' });
        employee = await repository.saveEmployee(actor, { ...input, version: employee.version }, employee.id);
        const card = await repository.card(actor, employee.id);
        assert.equal(card.staffNumber, employee.staffNumber); assert.equal('salary' in card, false); assert.equal('phone' in card, false);
        employee = await repository.archiveEmployee(actor, employee.id, employee.version, 'Integration archive test', false);
        assert.ok(employee.archivedAt); assert.equal((await tx.user.findUniqueOrThrow({ where: { id: low.id } })).isActive, true);
        await assert.rejects(() => repository.saveEmployee(actor, { ...input, version: employee.version }, employee.id), { code: 'EMPLOYEE_ARCHIVED' });
        employee = await repository.archiveEmployee(actor, employee.id, employee.version, 'Integration restore test', true);
        assert.equal(employee.archivedAt, null);
        const page = await repository.employees(actor, { page: 1, pageSize: 10, search: marker, archive: 'current' }); assert.equal(page.total, 1);
        await repository.saveReference(actor, 'departments', { name: marker, isActive: false, version: department.version }, department.id);
        await assert.rejects(() => repository.saveEmployee(actor, { ...input, staffNumber: `${marker}3`.toUpperCase(), userId: null }), { code: 'INVALID_REFERENCE' });
        employee = await repository.saveEmployee(actor, { ...input, version: employee.version }, employee.id); // Existing disabled reference is retained.
        const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { 'x-lyne-client': 'mobile' }, payload: { identifier: low.username, password: account.initialPassword } });
        assert.equal(login.statusCode, 200); const bearer = { authorization: `Bearer ${login.json().data.token}`, 'x-lyne-client': 'mobile' };
        const detail = await app.inject({ url: `/api/v1/employees/${employee.id}`, headers: bearer }); assert.equal(detail.statusCode, 200); assert.equal('salary' in detail.json().data, false);
        const denied = await app.inject({ method: 'PATCH', url: `/api/v1/employees/${employee.id}`, headers: bearer, payload: { ...input, version: employee.version } }); assert.equal(denied.statusCode, 403);
        await repository.saveRole(actor, { code: custom.code, name: custom.name, permissions: ['employees.read'], version: custom.version }, custom.id);
        assert.equal((await app.inject({ url: '/api/v1/auth/me', headers: bearer })).statusCode, 401);
        const afterRole = await tx.user.findUniqueOrThrow({ where: { id: low.id } });
        const reset = await repository.resetPassword(actor, low.id, afterRole.version);
        const afterReset = await tx.user.findUniqueOrThrow({ where: { id: low.id } }); assert.ok(afterReset.mustChangePassword); assert.notEqual(reset.initialPassword, account.initialPassword);
        assert.ok(await verifyPassword(afterReset.passwordHash, reset.initialPassword));
        const token = randomBytes(32).toString('base64url');
        await tx.session.create({ data: { userId: low.id, authVersion: afterReset.authVersion, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 60000) } });
        await repository.saveAccount(actor, { username: low.username, email: null, displayName: marker, roleCode: custom.code, isActive: false, version: afterReset.version }, low.id);
        assert.equal((await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${token}` } })).statusCode, 401);
        const events = await tx.auditLog.findMany({ where: { userId: { in: [owner.id, low.id] } } });
        assert.ok(events.length >= 15); const log = JSON.stringify(events);
        assert.equal(log.includes(account.initialPassword), false); assert.equal(log.includes(reset.initialPassword), false); assert.equal(log.includes('123.45'), false);
        assert.equal((await app.inject('/health')).json().phase, '2');
        completed = true;
      } finally { await app.close(); }
      throw rollback;
    }, { maxWait: 15000, timeout: 120000 });
  } catch (error) { if (error !== rollback) throw error; }
  assert.ok(completed); assert.equal(await db.user.count({ where: { username: { startsWith: marker } } }), 0);
  assert.equal(await db.employee.count({ where: { fullName: marker } }), 0);
  assert.deepEqual(await db.user.findUnique({ where: { username: process.env.SEED_ADMIN_USERNAME || 'admin' }, select: { id: true, passwordHash: true, authVersion: true, isActive: true } }), before);
  console.info('PHASE2_INTEGRATION_OK: CRUD, references, salary isolation, unique constraints, versions, archive/restore, cards, roles, reset, revocation and audit; all test data rolled back, real admin unchanged.');
} finally { await db.$disconnect(); }
