import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createDatabase } from "../src/db.js";

const track = process.argv.includes("--baseline") ? "baseline" : "migrations";
const db = createDatabase();
try {
  const applied = await db.$queryRaw<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`
    SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at
  `;
  if (!applied.length) throw new Error("Historique vide : utilisez db:bootstrap sur une base neuve.");
  for (const migration of applied) {
    if (migration.rolled_back_at) continue;
    if (!migration.finished_at) throw new Error(`Migration inachevée : ${migration.migration_name}.`);
    if (!/^[a-zA-Z0-9_-]+$/.test(migration.migration_name)) throw new Error("Nom de migration invalide.");
    let sql: Buffer;
    try { sql = await readFile(new URL(`../../../database/${track}/${migration.migration_name}/migration.sql`, import.meta.url)); }
    catch { throw new Error(`SQL original manquant : ${migration.migration_name}. Aucune migration ne sera exécutée.`); }
    const hash = createHash("sha256").update(sql).digest("hex");
    if (hash !== migration.checksum) throw new Error(`Empreinte SQL différente : ${migration.migration_name}. Aucune migration ne sera exécutée.`);
  }
  console.info("Historique des migrations vérifié.");
} catch (error) {
  const message = error instanceof Error && /^(Migration inachevée|Nom de migration|Historique vide|SQL original manquant|Empreinte SQL différente)/.test(error.message)
    ? error.message : "Historique non vérifiable. Contrôlez l’accès à la base ; aucune migration ne sera exécutée.";
  console.error(message);
  process.exitCode = 1;
} finally { await db.$disconnect(); }
