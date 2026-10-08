/** Read separate credentials without printing a URL containing the password. */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const url = new URL("mysql://127.0.0.1:3306/lyne_restaurant");
  url.hostname = env.DB_HOST || "127.0.0.1";
  url.port = env.DB_PORT || "3306";
  url.username = encodeURIComponent(env.DB_USER || "lyne");
  url.password = encodeURIComponent(env.DB_PASSWORD || "");
  url.pathname = `/${env.DB_NAME || "lyne_restaurant"}`;
  return url.toString();
}
