import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { prisma } from "../db.js";
import { digitsOnly } from "./cpfCnpj.js";

export function normalizePhoneDigits(raw: string): string {
  return digitsOnly(raw);
}

export function normalizeCpfCnpjDigits(raw: string): string {
  return digitsOnly(raw);
}

type UniqueIdentityOptions = {
  excludeUserId?: string;
};

export async function assertUniqueCpfCnpj(
  raw: string,
  options?: UniqueIdentityOptions
): Promise<string> {
  const digits = normalizeCpfCnpjDigits(raw);
  if (!digits) return digits;

  const excludeUserId = options?.excludeUserId;
  const userFilter = excludeUserId ? { not: excludeUserId } : undefined;

  const [owner, driver] = await Promise.all([
    prisma.ownerProfile.findFirst({
      where: {
        cpfCnpj: digits,
        ...(userFilter ? { userId: userFilter } : {}),
      },
      select: { userId: true },
    }),
    prisma.driverProfile.findFirst({
      where: {
        cpf: digits,
        ...(userFilter ? { userId: userFilter } : {}),
      },
      select: { userId: true },
    }),
  ]);

  if (owner || driver) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "CPF/CNPJ já existe em nosso cadastrado. Verifique se você já possui uma conta.",
    });
  }

  return digits;
}

export async function assertUniquePhone(
  raw: string,
  options?: UniqueIdentityOptions
): Promise<string> {
  const digits = normalizePhoneDigits(raw);
  if (!digits) return digits;

  const excludeUserId = options?.excludeUserId;
  const userFilter = excludeUserId ? { not: excludeUserId } : undefined;

  const [owner, driver] = await Promise.all([
    prisma.ownerProfile.findFirst({
      where: {
        phone: digits,
        ...(userFilter ? { userId: userFilter } : {}),
      },
      select: { userId: true },
    }),
    prisma.driverProfile.findFirst({
      where: {
        phone: digits,
        ...(userFilter ? { userId: userFilter } : {}),
      },
      select: { userId: true },
    }),
  ]);

  if (owner || driver) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Telefone já existe em nosso cadastrado. Verifique se você já possui uma conta.",
    });
  }

  return digits;
}

/** Converte violação de índice único do Prisma em mensagem amigável. */
export function rethrowUniqueIdentityError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? target.map(String)
      : typeof target === "string"
        ? [target]
        : [];

    if (fields.some((f) => f === "cpfCnpj" || f === "cpf")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "CPF/CNPJ já existe em nosso cadastrado. Verifique se você já possui uma conta.",
      });
    }
    if (fields.includes("phone")) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Telefone já existe em nosso cadastrado. Verifique se você já possui uma conta.",
      });
    }
  }

  throw error;
}
