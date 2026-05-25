/**
 * Cria ou atualiza usuário administrador (fase 2 — CRUD de campanhas).
 * Uso: cd backend && node scripts/seed-admin.mjs
 *
 * Variáveis opcionais:
 *   ADMIN_EMAIL    (default: admin@uniaolocacar.com.br)
 *   ADMIN_PASSWORD (default: admin123456)
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRIVACY_POLICY_VERSION = "1";
const TERMS_OF_USE_VERSION = "1";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@uniaolocacar.com.br")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin123456";

  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD deve ter pelo menos 6 caracteres");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      privacyPolicyAcceptedAt: now,
      termsOfUseVersion: TERMS_OF_USE_VERSION,
      termsOfUseAcceptedAt: now,
    },
    update: {
      role: "ADMIN",
      passwordHash,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      privacyPolicyAcceptedAt: now,
      termsOfUseVersion: TERMS_OF_USE_VERSION,
      termsOfUseAcceptedAt: now,
    },
  });

  console.log("Admin pronto:", user.email, user.id);
  if (!process.env.ADMIN_PASSWORD) {
    console.log("Senha padrão: admin123456 (defina ADMIN_PASSWORD em produção)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
