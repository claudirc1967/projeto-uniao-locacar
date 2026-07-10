import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

/** Pares para `translate` no PostgreSQL (acentos → ASCII). */
export const PG_ACCENT_FROM =
  "áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ";
export const PG_ACCENT_TO =
  "aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN";

/** Normaliza texto para comparação: minúsculas e sem acentos. */
export function foldAccents(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function foldedColumnLike(
  column: Prisma.Sql,
  rawNeedle: string
): Prisma.Sql {
  const pattern = `%${escapeLikePattern(rawNeedle)}%`;
  return Prisma.sql`translate(lower(COALESCE(${column}, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE translate(lower(${pattern}), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) ESCAPE '\\'`;
}

/** Igualdade ignorando maiúsculas/minúsculas e acentos (cores canônicas). */
function foldedColumnEquals(
  column: Prisma.Sql,
  rawNeedle: string
): Prisma.Sql {
  const needle = rawNeedle.trim();
  return Prisma.sql`translate(lower(COALESCE(${column}, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) = translate(lower(${needle}), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO})`;
}

export type VehicleTextContainsFilters = {
  brandContains?: string;
  modelContains?: string;
  corContains?: string;
  pickupCityContains?: string;
  ownerNameContains?: string;
};

/**
 * IDs de veículos cujo texto bate ignorando maiúsculas/minúsculas e acentos.
 * Retorna `undefined` se nenhum filtro de texto foi informado.
 */
export async function findVehicleIdsByFoldedContains(
  filters: VehicleTextContainsFilters
): Promise<string[] | undefined> {
  const conditions: Prisma.Sql[] = [];

  const brand = filters.brandContains?.trim();
  if (brand) {
    conditions.push(foldedColumnEquals(Prisma.raw(`v."brand"`), brand));
  }
  const model = filters.modelContains?.trim();
  if (model) {
    conditions.push(foldedColumnEquals(Prisma.raw(`v."model"`), model));
  }
  const cor = filters.corContains?.trim();
  if (cor) {
    conditions.push(foldedColumnEquals(Prisma.raw(`v."cor"`), cor));
  }
  const city = filters.pickupCityContains?.trim();
  if (city) {
    conditions.push(foldedColumnLike(Prisma.raw(`v."pickupCity"`), city));
  }
  const ownerName = filters.ownerNameContains?.trim();
  if (ownerName) {
    conditions.push(
      foldedColumnLike(Prisma.raw(`op."nomeRazaoSocial"`), ownerName)
    );
  }

  if (conditions.length === 0) return undefined;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT v.id
    FROM "Vehicle" v
    LEFT JOIN "OwnerProfile" op ON op."userId" = v."ownerUserId"
    WHERE ${Prisma.join(conditions, " AND ")}
  `;
  return rows.map((r) => r.id);
}
