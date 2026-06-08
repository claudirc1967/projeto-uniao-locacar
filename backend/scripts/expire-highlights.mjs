// Execução pontual da rotina de expiração de destaques (fase 5).
// Uso: npm run highlights:expire  (roda via tsx)
import { runHighlightExpirationSweep } from "../src/highlights/expiration.ts";
import { prisma } from "../src/db.ts";

async function main() {
  const result = await runHighlightExpirationSweep();
  // eslint-disable-next-line no-console
  console.log("[highlights:expire]", result);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[highlights:expire:error]", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
