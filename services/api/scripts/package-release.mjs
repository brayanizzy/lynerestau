import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Allowlisted build outputs only: no secrets, original images, database dump or mobile toolchain.
const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const target = resolve(root, process.argv[2] || '.tmp/phase2-release');
if (!target.startsWith(join(root, '.tmp') + sep)) {
  throw new Error('Release directory must be inside the project .tmp directory');
}
await mkdir(target, { recursive: false });
const api = JSON.parse(await readFile(join(root, 'services/api/package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const rootPackage = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const dependencies = {};
for (const name of Object.keys(api.dependencies)) {
  dependencies[name] = name === '@lyne/shared' ? 'file:./packages/shared' : lock.packages[`node_modules/${name}`].version;
}
const manifest = { name: 'lyne-phase2-release', version: '0.3.0', private: true, type: 'module',
  engines: { node: '>=24' }, scripts: { start: 'node app.cjs', seed: 'node --env-file=../.env --env-file=../.env.seed api/seed.js', verify: 'node --env-file=../.env verify-phase2.mjs' },
  dependencies, overrides: { '@prisma/adapter-mariadb': rootPackage.overrides['@prisma/adapter-mariadb'] } };
await writeFile(join(target, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
await cp(join(root, 'services/api/dist'), join(target, 'api'), { recursive: true, filter: source => !source.endsWith('.map') && !source.endsWith('.d.ts') });
await cp(join(root, 'apps/admin-web/dist'), join(target, 'web'), { recursive: true });
await cp(join(root, 'packages/shared/dist'), join(target, 'packages/shared/dist'), { recursive: true });
const shared = JSON.parse(await readFile(join(root, 'packages/shared/package.json'), 'utf8'));
delete shared.devDependencies; delete shared.scripts;
await writeFile(join(target, 'packages/shared/package.json'), JSON.stringify(shared, null, 2) + '\n');
await cp(join(root, 'services/api/deploy/app.cjs'), join(target, 'app.cjs'));
await cp(join(root, 'services/api/deploy/verify-database.mjs'), join(target, 'verify-database.mjs'));
await cp(join(root, 'services/api/deploy/verify-phase2.mjs'), join(target, 'verify-phase2.mjs'));
console.info(`RELEASE_PREPARED ${target}`);
