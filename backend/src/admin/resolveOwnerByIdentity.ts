import { TRPCError } from "@trpc/server";
import { prisma } from "../db.js";
import {
  normalizeCpfCnpjDigits,
  normalizePhoneDigits,
} from "../validation/uniqueIdentity.js";
import { phoneValidationMessage } from "../validation/phone.js";

const ownerProfileSelect = {
  userId: true,
  nomeRazaoSocial: true,
  cpfCnpj: true,
  phone: true,
  user: { select: { role: true } },
} as const;

export type ResolvedOwnerIdentity = {
  ownerUserId: string;
  nomeRazaoSocial: string | null;
  cpfCnpj: string;
  phone: string;
};

export async function resolveOwnerByIdentity(input: {
  cpfCnpj?: string;
  phone?: string;
}): Promise<ResolvedOwnerIdentity> {
  const cpfDigits = input.cpfCnpj?.trim()
    ? normalizeCpfCnpjDigits(input.cpfCnpj)
    : "";
  const phoneDigits = input.phone?.trim()
    ? normalizePhoneDigits(input.phone)
    : "";

  if (!cpfDigits && !phoneDigits) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Informe CPF/CNPJ ou telefone do locador.",
    });
  }

  if (cpfDigits && cpfDigits.length < 11) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "CPF/CNPJ incompleto.",
    });
  }

  if (phoneDigits) {
    const phoneMsg = phoneValidationMessage(phoneDigits, {
      required: false,
      label: "Telefone",
    });
    if (phoneMsg) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: phoneMsg,
      });
    }
  }

  const [byCpf, byPhone] = await Promise.all([
    cpfDigits
      ? prisma.ownerProfile.findUnique({
          where: { cpfCnpj: cpfDigits },
          select: ownerProfileSelect,
        })
      : Promise.resolve(null),
    phoneDigits
      ? prisma.ownerProfile.findUnique({
          where: { phone: phoneDigits },
          select: ownerProfileSelect,
        })
      : Promise.resolve(null),
  ]);

  if (cpfDigits && phoneDigits) {
    if (!byCpf && !byPhone) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nenhum locador encontrado com esse CPF/CNPJ ou telefone.",
      });
    }
    if (byCpf && byPhone && byCpf.userId !== byPhone.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "CPF/CNPJ e telefone informados pertencem a locadores diferentes.",
      });
    }
  }

  const profile = byCpf ?? byPhone;
  if (!profile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nenhum locador encontrado com esse CPF/CNPJ ou telefone.",
    });
  }

  if (profile.user.role !== "OWNER") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nenhum locador encontrado com esse CPF/CNPJ ou telefone.",
    });
  }

  return {
    ownerUserId: profile.userId,
    nomeRazaoSocial: profile.nomeRazaoSocial?.trim() || null,
    cpfCnpj: profile.cpfCnpj,
    phone: profile.phone,
  };
}
