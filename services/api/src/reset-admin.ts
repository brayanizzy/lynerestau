import { NewPasswordSchema } from "@lyne/shared";
import { createDatabase } from "./db.js";
import { hashPassword } from "./auth/password.js";

// Operator-only recovery via SSH. No public password-reset endpoint in Phase 1.
const db = createDatabase();
try {
  const result = NewPasswordSchema.safeParse(process.env.RESET_ADMIN_PASSWORD);
  if (!result.success) throw new Error("RESET_ADMIN_PASSWORD requis (12 à 128 caractères).");
  const user = await db.user.findUniqueOrThrow({ where: { username: process.env.SEED_ADMIN_USERNAME ?? "admin" }, include: { role: true } });
  if (user.role.code !== "ADMIN") throw new Error("Le compte ciblé n’est pas administrateur.");
  const passwordHash = await hashPassword(result.data);
  await db.$transaction(async tx => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: true, authVersion: { increment: 1 } } });
    await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { userId: user.id, objectId: user.id, action: "system.admin.password.reset", module: "auth", metadata: { source: "ssh-operator" } } });
  });
  console.info("Mot de passe initial rétabli ; sessions révoquées ; changement obligatoire à la connexion.");
} catch { console.error("Réinitialisation refusée. Vérifier le compte, la configuration et le secret RESET_ADMIN_PASSWORD."); process.exitCode = 1; }
finally { await db.$disconnect(); }
