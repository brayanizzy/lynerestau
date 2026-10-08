import { defineConfig } from "prisma/config";
import { databaseUrl } from "../services/api/src/database-config.js";

export default defineConfig({
  schema: "schema.prisma",
  migrations: { path: "migrations" },
  datasource: { url: databaseUrl() },
});
