import { TRPCError } from "@trpc/server";
import type { VehicleType } from "@prisma/client";
import { prisma } from "../db.js";

async function findActiveBrand(name: string) {
  return prisma.vehicleBrand.findFirst({
    where: { name, active: true },
  });
}

async function findActiveModel(
  brandId: string,
  name: string,
  vehicleType: VehicleType
) {
  return prisma.vehicleModel.findFirst({
    where: { brandId, name, vehicleType, active: true },
  });
}

/** Create: strings opcionais → null se vazio; valida no catálogo. */
export async function resolveBrandModelForCreate(input: {
  brand?: string | null;
  model?: string | null;
  vehicleType: VehicleType;
}): Promise<{ brand: string | null; model: string | null }> {
  const brand = input.brand?.trim() || null;
  const model = input.model?.trim() || null;

  if (!brand) {
    if (model) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Informe a marca antes do modelo.",
      });
    }
    return { brand: null, model: null };
  }

  const brandRow = await findActiveBrand(brand);
  if (!brandRow) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Marca inválida: "${brand}". Selecione uma marca do catálogo.`,
    });
  }

  if (!model) {
    return { brand: brandRow.name, model: null };
  }

  const modelRow = await findActiveModel(
    brandRow.id,
    model,
    input.vehicleType
  );
  if (!modelRow) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Modelo inválido para ${brandRow.name}: "${model}".`,
    });
  }

  return { brand: brandRow.name, model: modelRow.name };
}

/**
 * Update: `undefined` = não alterar o campo.
 * `null` ou `""` = limpar.
 */
export async function resolveBrandModelForUpdate(input: {
  brand?: string | null;
  model?: string | null;
  vehicleType: VehicleType;
  currentBrand: string | null;
  currentModel: string | null;
}): Promise<{ brand?: string | null; model?: string | null }> {
  const brandProvided = input.brand !== undefined;
  const modelProvided = input.model !== undefined;

  if (!brandProvided && !modelProvided) {
    return {};
  }

  const nextBrand = brandProvided
    ? input.brand?.trim() || null
    : input.currentBrand?.trim() || null;
  const nextModel = modelProvided
    ? input.model?.trim() || null
    : input.currentModel?.trim() || null;

  if (!nextBrand && nextModel) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Informe a marca antes do modelo.",
    });
  }

  const out: { brand?: string | null; model?: string | null } = {};

  if (!nextBrand) {
    if (brandProvided) out.brand = null;
    if (modelProvided || brandProvided) out.model = null;
    return out;
  }

  const brandRow = await findActiveBrand(nextBrand);
  if (!brandRow) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Marca inválida: "${nextBrand}". Selecione uma marca do catálogo.`,
    });
  }

  if (brandProvided) out.brand = brandRow.name;

  if (!nextModel) {
    if (modelProvided || (brandProvided && nextBrand !== input.currentBrand)) {
      out.model = null;
    }
    return out;
  }

  const modelRow = await findActiveModel(
    brandRow.id,
    nextModel,
    input.vehicleType
  );
  if (!modelRow) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Modelo inválido para ${brandRow.name}: "${nextModel}".`,
    });
  }

  if (modelProvided || brandProvided) out.model = modelRow.name;
  return out;
}
