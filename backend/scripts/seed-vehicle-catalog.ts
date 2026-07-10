/**
 * Popula/atualiza o catálogo de marcas e modelos.
 * Uso: cd backend && npm run catalog:seed
 * (idempotente — upsert por nome)
 */
import { PrismaClient, type VehicleType } from "@prisma/client";
import { VEHICLE_CATALOG_SEED } from "../src/vehicleCatalog/seedData.js";

const prisma = new PrismaClient();

async function main() {
  let brandCount = 0;
  let modelCount = 0;

  for (let bi = 0; bi < VEHICLE_CATALOG_SEED.length; bi++) {
    const entry = VEHICLE_CATALOG_SEED[bi]!;
    const brand = await prisma.vehicleBrand.upsert({
      where: { name: entry.brand },
      create: {
        name: entry.brand,
        sortOrder: bi,
        active: true,
      },
      update: {
        sortOrder: bi,
        active: true,
      },
    });
    brandCount += 1;

    for (const vehicleType of ["CAR", "MOTORCYCLE"] as VehicleType[]) {
      const names = entry.models[vehicleType] ?? [];
      for (let mi = 0; mi < names.length; mi++) {
        const name = names[mi]!;
        await prisma.vehicleModel.upsert({
          where: {
            brandId_name_vehicleType: {
              brandId: brand.id,
              name,
              vehicleType,
            },
          },
          create: {
            brandId: brand.id,
            name,
            vehicleType,
            sortOrder: mi,
            active: true,
          },
          update: {
            sortOrder: mi,
            active: true,
          },
        });
        modelCount += 1;
      }
    }
  }

  console.log(
    `Catálogo OK: ${brandCount} marcas, ${modelCount} modelos (upsert).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
