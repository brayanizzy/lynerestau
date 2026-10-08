import { mkdir, readdir, lstat, readFile, copyFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Public files only. The existing API and its data remain outside public_html.
const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const target = resolve(root, process.argv[2] || '.tmp/hostinger-web');
if (!target.startsWith(join(root, '.tmp') + sep)) {
  throw new Error('Destination attendue dans .tmp, dans un nouveau dossier.');
}
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
await mkdir(target, { recursive: false });
const files = {};
async function copyPublic(source, relative, extensions) {
  const stat = await lstat(source);
  if (stat.isSymbolicLink()) throw new Error(`Lien interdit : ${relative}`);
  if (stat.isDirectory()) {
    for (const name of (await readdir(source)).sort()) {
      await copyPublic(join(source, name), `${relative}/${name}`, extensions);
    }
    return;
  }
  if (!stat.isFile() || !extensions.includes(extname(source))) {
    throw new Error(`Fichier public inattendu : ${relative}`);
  }
  await mkdir(dirname(join(target, relative)), { recursive: true });
  await copyFile(source, join(target, relative));
  files[relative] = createHash('sha256').update(await readFile(source)).digest('hex');
}
await copyPublic(join(root, 'website/index.html'), 'index.html', ['.html']);
await copyPublic(join(root, 'website/logo-lyne.png'), 'logo-lyne.png', ['.png']);
await copyPublic(join(root, 'website/assets'), 'assets', ['.webp']);
await copyPublic(join(root, 'apps/admin-web/dist'), 'gestion', ['.html', '.js', '.css', '.png', '.svg', '.woff2']);
for (const [source, relative] of [
  ['public-root.htaccess', '.htaccess'],
  ['public-api.htaccess', 'api/.htaccess'],
]) {
  await mkdir(dirname(join(target, relative)), { recursive: true });
  const content = await readFile(join(root, 'services/api/deploy', source));
  await writeFile(join(target, relative), content);
  files[relative] = createHash('sha256').update(content).digest('hex');
}
await writeFile(join(target, 'release.json'), JSON.stringify({
  sourceCommit,
  scope: 'public-web-only',
  apiRelease: 'phase2-recovery-20261006',
  databaseMigration: false,
  files,
}, null, 2) + '\n');
console.info(`PUBLIC_WEB_PREPARED ${target} (${Object.keys(files).length + 1} fichiers)`);
