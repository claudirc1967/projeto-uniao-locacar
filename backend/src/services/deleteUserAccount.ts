import { prisma } from "../db.js";
import { deleteObject } from "../storage/s3.js";

/**
 * Remove arquivos no S3 ligados ao usuário e apaga o registro (cascade no banco).
 * Falhas no S3 não impedem a exclusão da conta.
 */
export async function deleteUserAccountData(userId: string): Promise<void> {
  const bucketConfigured = Boolean(process.env.AWS_S3_BUCKET?.trim());
  const keys = new Set<string>();

  const vehicles = await prisma.vehicle.findMany({
    where: { ownerUserId: userId },
    select: { id: true },
  });
  const vehicleIds = vehicles.map((v) => v.id);
  if (vehicleIds.length > 0) {
    const photos = await prisma.vehiclePhoto.findMany({
      where: { vehicleId: { in: vehicleIds } },
      select: { key: true },
    });
    for (const p of photos) keys.add(p.key);
  }

  const rentals = await prisma.rental.findMany({
    where: {
      OR: [
        { driverUserId: userId },
        { vehicle: { ownerUserId: userId } },
      ],
    },
    select: { contractS3Key: true },
  });
  for (const r of rentals) {
    if (r.contractS3Key) keys.add(r.contractS3Key);
  }

  if (bucketConfigured) {
    for (const key of keys) {
      try {
        await deleteObject(key);
      } catch {
        /* best-effort */
      }
    }
  }

  await prisma.user.delete({ where: { id: userId } });
}
