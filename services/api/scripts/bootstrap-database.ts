import { spawnSync } from "node:child_process";
import { createDatabase } from "../src/db.js";
const db = createDatabase();
let empty = false;
try {
  const tables = await db.$queryRaw<{ name: string }[]>`SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`;
  const routines = await db.$queryRaw<{ name: string }[]>`SELECT ROUTINE_NAME AS name FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE()`;
  const events = await db.$queryRaw<{ name: string }[]>`SELECT EVENT_NAME AS name FROM information_schema.EVENTS WHERE EVENT_SCHEMA = DATABASE()`;
  if (tables.length || routines.length || events.length) throw new Error("NOT_EMPTY");
  empty = true;
} catch (error) {
  console.error(error instanceof Error && error.message === "NOT_EMPTY"
    ? "Base non vide : initialisation refusée. Aucun historique existant ne sera modifié."
    : "Impossible de confirmer une base vide : initialisation refusée.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }
if (empty) {
  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "database/baseline.config.ts"], { stdio: "inherit", env: process.env });
  process.exitCode = result.status ?? 1;
}
