// Read-only server inspection. Writes only its private diagnostic report and an
// exact, checksum-verified copy of the historical migration if it is recovered.
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const home = resolve(process.argv[2] || homedir());
const privateRoot = join(home, 'lyne-app');
const publicRoot = join(home, 'domains/lyne-restau.alikakonnect.com/public_html');
const expected = 'b2fda43adf38a23f52f17ca51a4f11e888824b5fab61565c110c5ec4e3eb9957';
const hash = data => createHash('sha256').update(data).digest('hex');
const inside = path => path === privateRoot || path.startsWith(privateRoot + sep);
const exists = async path => stat(path).then(() => true, () => false);
const result = { inspectedAt: new Date().toISOString(), node: process.version, configuration: {}, active: {}, database: { checked: false }, files: [], historicalMigration: { expectedSha256: expected, found: [], skippedArchives: [] }, gitDirectories: [], warnings: [] };
if (!await exists(privateRoot) || !await exists(publicRoot)) throw new Error('Dossiers LYNE absents : exécuter ce diagnostic sur le serveur du projet.');
const output = join(privateRoot, 'diagnostics', 'preflight-' + Date.now());
await mkdir(output, { recursive: true, mode: 0o700 });
for (const name of ['.env', '.env.runtime', '.env.seed']) result.configuration[name] = await exists(join(privateRoot, name));
let appRoot;
try {
  const rules = await readFile(join(publicRoot, 'api/.htaccess'), 'utf8');
  appRoot = /^\s*PassengerAppRoot\s+["']?([^\r\n"']+)/m.exec(rules)?.[1]?.trim();
  const startup = /^\s*PassengerStartupFile\s+([^\r\n]+)/m.exec(rules)?.[1]?.trim() || 'app.cjs';
  if (!appRoot || !inside(resolve(appRoot)) || !/^[a-zA-Z0-9_.-]+$/.test(startup)) throw new Error('Unsupported entry');
  appRoot = resolve(appRoot); result.active = { appRoot, startup };
  // Support the small recovery loader used on this hosting account.
  const loader = await readFile(join(appRoot, startup), 'utf8');
  const target = /(?:require\(|import\()\s*['"](\.\/[a-zA-Z0-9_./-]+\/app\.cjs)['"]/.exec(loader)?.[1];
  if (target && inside(resolve(appRoot, target))) result.active.releaseRoot = resolve(appRoot, target, '..');
  else result.active.releaseRoot = appRoot;
} catch { result.warnings.push('Entrée Passenger non résolue : inspection manuelle nécessaire.'); }
for (const name of ['api/.htaccess', '.htaccess', 'gestion/index.html']) {
  try { const data = await readFile(join(publicRoot, name)); result.files.push({ path: name, sha256: hash(data), bytes: data.length }); }
  catch { result.warnings.push('Fichier non lisible : ' + name); }
}
if (result.active.releaseRoot && await exists(join(result.active.releaseRoot, 'api/db.js'))) {
  let db;
  try {
    for (const name of ['.env', '.env.runtime']) if (result.configuration[name]) process.loadEnvFile(join(privateRoot, name));
    const module = await import(pathToFileURL(join(result.active.releaseRoot, 'api/db.js')).href);
    db = module.createDatabase();
    const migrations = await db.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at`;
    const tables = await db.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`;
    result.database = { checked: true, migrations, tables: tables.map(table => table.name) };
  } catch { result.warnings.push('Historique DB non lisible : aucune donnée de configuration ni erreur de connexion sensible affichée.'); }
  finally { if (db) await db.$disconnect(); }
}
const archives = [];
async function inspectSql(data, origin) {
  if (hash(data) !== expected) return;
  const file = join(output, '20260928170000_personnel.migration.sql');
  await writeFile(file, data, { mode: 0o600 });
  result.historicalMigration.found.push({ origin, sha256: expected, recoveredFile: file });
}
let inspected = 0;
async function visit(directory, depth = 0) {
  if (depth > 16 || inspected > 50000) { result.warnings.push('Recherche limitée : ' + relative(privateRoot, directory)); return; }
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { result.warnings.push('Dossier non lisible : ' + relative(privateRoot, directory)); return; }
  for (const entry of entries) {
    const file = join(directory, entry.name); inspected++;
    if (entry.isDirectory()) {
      if (entry.name === '.git') result.gitDirectories.push(directory);
      else if (!['node_modules', 'diagnostics', 'uploads', '.cache', '.npm', '.expo'].includes(entry.name)) await visit(file, depth + 1);
    } else if (entry.isFile()) {
      const size = (await stat(file)).size;
      if (/\.sql$/i.test(entry.name) && size < 1024 * 1024) await inspectSql(await readFile(file), relative(privateRoot, file));
      if (/\.(tar\.gz|tgz)$/i.test(entry.name) && /phase|source|workspace|recovery|backup/i.test(entry.name)) {
        if (size <= 64 * 1024 * 1024 && archives.length < 50) archives.push(file);
        else result.historicalMigration.skippedArchives.push(relative(privateRoot, file));
      }
    }
  }
}
await visit(privateRoot);
for (const file of archives) {
  try {
    const names = execFileSync('tar', ['-tzf', file], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(name => /(?:^|\/)migration\.sql$/.test(name));
    for (const name of names) {
      const data = execFileSync('tar', ['-xOzf', file, '--', name], { maxBuffer: 1024 * 1024, timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] });
      await inspectSql(data, relative(privateRoot, file) + ':' + name);
    }
  } catch { result.historicalMigration.skippedArchives.push(relative(privateRoot, file)); }
}
await writeFile(join(output, 'rapport.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
console.info('Diagnostic terminé. Aucun déploiement, seed ou changement de migration exécuté.');
console.info('Historique DB lu : ' + result.database.checked);
console.info('SQL original retrouvé : ' + (result.historicalMigration.found.length > 0));
console.info('Rapport privé : ' + join(output, 'rapport.json'));
if (result.warnings.length || result.historicalMigration.skippedArchives.length) console.info('Limites de recherche consignées dans le rapport.');
