import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";
import { databaseUrl } from "./database-config.js";

export function createDatabase() {
  const url = new URL(databaseUrl());
  if (url.protocol !== "mysql:") throw new Error("Une URL MySQL est requise");
  if (url.search) throw new Error("Utiliser les paramètres DB_* sans options URL non prises en charge");
  return new PrismaClient({ adapter: new PrismaMariaDb({
    host: url.hostname, port: Number(url.port || 3306),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)), connectionLimit: 5,
    connectTimeout: 5000, acquireTimeout: 5000, timezone: "Z",
  // MariaDB 11.8 rejects LIKE parameters with the binary protocol's collation.
  // The connector's parameterized text protocol preserves escaping and UTF-8.
  }, { useTextProtocol: true }) });
}
