import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
const app = await buildApp({ config, webRoot: process.env.ADMIN_WEB_DIST });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { void app.close().then(() => { process.exitCode = 0; }); });
}
try { await app.listen({ host: config.API_HOST, port: config.API_PORT }); }
catch (error) { app.log.error({ errorName: (error as Error).name }, "Démarrage impossible"); await app.close(); process.exitCode = 1; }
