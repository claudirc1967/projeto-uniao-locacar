import { TRPCError } from "@trpc/server";
import { prisma } from "../db.js";
import {
  normalizeCpfCnpjDigits,
  normalizePhoneDigits,
} from "../validation/uniqueIdentity.js";
import { phoneValidationMessage } from "../validation/phone.js";

const driverProfileSelect = {
  userId: true,
  status: true,
  fullName: true,
  phone: true,
  cpf: true,
  cnh: true,
  rejectionReason: true,
  user: { select: { email: true, role: true, createdAt: true } },
} as const;

export type ResolvedDriverIdentity = {
  driverUserId: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  fullName: string | null;
  phone: string | null;
  cpf: string | null;
  cnh: string | null;
  rejectionReason: string | null;
  createdAt: Date;
};

export async function resolveDriverByIdentity(input: {
  cpf?: string;
  phone?: string;
}): Promise<ResolvedDriverIdentity> {
  const cpfDigits = input.cpf?.trim()
    ? normalizeCpfCnpjDigits(input.cpf)
    : "";
  const phoneDigits = input.phone?.trim()
    ? normalizePhoneDigits(input.phone)
    : "";

  if (!cpfDigits && !phoneDigits) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Informe CPF ou telefone do motorista.",
    });
  }

  if (cpfDigits && cpfDigits.length !== 11) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "CPF incompleto (11 dígitos).",
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
      ? prisma.driverProfile.findFirst({
          where: { cpf: cpfDigits },
          select: driverProfileSelect,
        })
      : Promise.resolve(null),
    phoneDigits
      ? prisma.driverProfile.findFirst({
          where: { phone: phoneDigits },
          select: driverProfileSelect,
        })
      : Promise.resolve(null),
  ]);

  if (cpfDigits && phoneDigits) {
    if (!byCpf && !byPhone) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nenhum motorista encontrado com esse CPF ou telefone.",
      });
    }
    if (byCpf && byPhone && byCpf.userId !== byPhone.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "CPF e telefone informados pertencem a motoristas diferentes.",
      });
    }
  }

  const profile = byCpf ?? byPhone;
  if (!profile || profile.user.role !== "DRIVER") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nenhum motorista encontrado com esse CPF ou telefone.",
    });
  }

  return {
    driverUserId: profile.userId,
    email: profile.user.email,
    status: profile.status,
    fullName: profile.fullName?.trim() || null,
    phone: profile.phone,
    cpf: profile.cpf,
    cnh: profile.cnh,
    rejectionReason: profile.rejectionReason,
    createdAt: profile.user.createdAt,
  };
}
