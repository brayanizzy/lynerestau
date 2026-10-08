import { pathToFileURL } from "node:url";
import { z } from "zod";
import { NewPasswordSchema, PERMISSIONS, PERMISSION_LABELS } from "@lyne/shared";
import { createDatabase } from "./db.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { hashPassword } from "./auth/password.js";

const roles = [
  ["ADMIN", "Administrateur"], ["MANAGER", "Gérant"],
  ["RECEPTION", "Réception / Caisse"], ["KITCHEN", "Cuisine"],
] as const;

/** Never overwrite existing credentials, statuses or custom role grants. */
export async function seed(db: PrismaClient, env: NodeJS.ProcessEnv = process.env) {
  const username = z.string().regex(/^[a-z0-9._-]{3,100}$/).parse(env.SEED_ADMIN_USERNAME ?? "admin");
  const existing = await db.user.findUnique({ where: { username } });
  let passwordHash: string | undefined;
  if (!existing) {
    const parsed = NewPasswordSchema.safeParse(env.SEED_ADMIN_PASSWORD);
    if (!parsed.success) throw new Error("SEED_ADMIN_PASSWORD requis : 12 à 128 caractères (ne sera jamais affiché)");
    passwordHash = await hashPassword(parsed.data);
  }
  return db.$transaction(async tx => {
    const existingAdminRole = await tx.role.findUnique({ where: { code: "ADMIN" } });
    for (const [code, name] of roles) await tx.role.upsert({ where: { code }, update: {}, create: { code, name } });
    for (const code of PERMISSIONS) await tx.permission.upsert({ where: { code }, update: {}, create: { code, name: PERMISSION_LABELS[code] } });
    const role = await tx.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
    if (!existingAdminRole) {
      const permissions = await tx.permission.findMany({ where: { code: { in: [...PERMISSIONS] } } });
      for (const permission of permissions) await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
    if (passwordHash) {
      const user = await tx.user.create({ data: { username, displayName: "Administrateur LYNE", passwordHash, roleId: role.id, mustChangePassword: true } });
      await tx.auditLog.create({ data: { userId: user.id, objectId: user.id, module: "auth", action: "system.admin.seeded" } });
      return { created: true, username };
    }
    return { created: false, username };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = createDatabase();
  try { const result = await seed(db); console.info(result.created ? "Compte initial créé ; changement du mot de passe obligatoire." : "Seed vérifié ; compte existant préservé."); }
  catch (error) { console.error(error instanceof Error && error.message.startsWith("SEED_ADMIN_PASSWORD") ? error.message : "Seed impossible. Vérifiez la configuration et les migrations."); process.exitCode = 1; }
  finally { await db.$disconnect(); }
}
