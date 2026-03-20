import { prisma } from "./db.js";

/**
 * Motorista não pode nova solicitação se:
 * - existe bloqueio ativo na tabela, ou
 * - (legado) existe locação REJECTED e ainda não há registro de desbloqueio.
 */
export async function isDriverBlockedFromVehicleRequest(
  vehicleId: string,
  driverUserId: string
): Promise<boolean> {
  const block = await prisma.vehicleDriverBlock.findUnique({
    where: {
      vehicleId_driverUserId: { vehicleId, driverUserId },
    },
  });
  if (block?.active) return true;
  if (!block) {
    const legacyRejected = await prisma.rental.findFirst({
      where: {
        vehicleId,
        driverUserId,
        status: "REJECTED",
      },
    });
    return !!legacyRejected;
  }
  return false;
}
