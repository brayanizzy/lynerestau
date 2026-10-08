import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Provision a fresh, ignored operator artifact; never print or overwrite its secret.
const file = fileURLToPath(new URL("../.env.seed", import.meta.url));
try {
  await writeFile(file, `# SECRET LOCAL — ne jamais versionner ni publier\nSEED_ADMIN_USERNAME=admin\nSEED_ADMIN_PASSWORD=${randomBytes(24).toString("base64url")}\n`, { flag: "wx", mode: 0o600 });
  console.info("Secret initial créé dans services/api/.env.seed (ignoré par Git).");
} catch (error) {
  if (error.code === "EEXIST") console.info("Secret initial existant conservé.");
  else throw error;
}
