import { z } from "zod";

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  UPLOADS_DIR: z.string().min(1).default("../../.tmp/private-photos"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  // Never trust arbitrary public X-Forwarded-For. Use only a verified local proxy.
  TRUST_PROXY: z.enum(["false", "loopback"]).default("false"),
});
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) throw new Error(`Configuration invalide : ${parsed.error.issues.map(i => i.path.join(".")).join(", ")}`);
  const config = parsed.data;
  const origins = config.CORS_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) throw new Error("CORS_ORIGINS : origines exactes requises");
    if (config.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("HTTPS requis en production");
  }
  return { ...config, origins };
}
export type Config = ReturnType<typeof readConfig>;
