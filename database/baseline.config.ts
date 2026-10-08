import { defineConfig } from "prisma/config";
import { databaseUrl } from "../services/api/src/database-config.js";
// Separate history for new databases only; never resolves or overwrites legacy migrations.
export default defineConfig({ schema: "schema.prisma", migrations: { path: "baseline" }, datasource: { url: databaseUrl() } });
