import type { VehicleType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const vehicleTypeSchema = z.enum(["CAR", "MOTORCYCLE"]);

export function normalizeVehicleCapacity(
  vehicleType: VehicleType,
  portas: number | null | undefined,
  lugares: number | null | undefined
): { portas: number | null; lugares: number | null } {
  if (vehicleType === "MOTORCYCLE") {
    return { portas: null, lugares: null };
  }

  if (portas == null || portas < 2 || portas > 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Portas: informe um número entre 2 e 8.",
    });
  }
  if (lugares == null || lugares < 1 || lugares > 15) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Lugares: informe um número entre 1 e 15.",
    });
  }

  return { portas, lugares };
}
