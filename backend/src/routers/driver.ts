import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthedContext } from "../context.js";
import { isDriverBlockedFromVehicleRequest } from "../driverVehicleBlock.js";
import { prisma } from "../db.js";
import { sendEmail } from "../email/consoleEmail.js";
import { driverProcedure, router } from "../trpc.js";

export const driverRouter = router({
  completePreRegistration: driverProcedure
    .input(
      z.object({
        fullName: z.string().min(3),
        phone: z.string().min(8),
        cpf: z.string().min(11).max(14),
        cnh: z.string().min(5),
        cnhCategory: z.string().min(1),
        cnhValidity: z.string().min(8),
        cnhYears: z.coerce.number().int().positive(),
        cnhHasEar: z.boolean(),
        criminalAttestation: z.boolean(),
        uberRegistered: z.boolean(),
        cep: z.string().min(8).max(9),
        logradouro: z.string().min(1),
        bairro: z.string().min(1),
        cidade: z.string().min(1),
        uf: z.string().length(2),
        numero: z.string().min(1),
        complemento: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.cnhHasEar) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ative a opção de CNH com EAR.",
        });
      }
      if (!input.criminalAttestation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ative a opção de Atestado de Antecedentes Criminais.",
        });
      }
      await prisma.driverProfile.update({
        where: { userId: (ctx as AuthedContext).user.id },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          cpf: input.cpf,
          cnh: input.cnh,
          cnhCategory: input.cnhCategory,
          cnhValidity: input.cnhValidity,
          cnhYears: input.cnhYears,
          cnhHasEar: input.cnhHasEar,
          criminalAttestation: input.criminalAttestation,
          uberRegistered: input.uberRegistered,
          cep: input.cep.replace(/\D/g, ""),
          logradouro: input.logradouro,
          bairro: input.bairro,
          cidade: input.cidade,
          uf: input.uf.toUpperCase(),
          numero: input.numero,
          complemento: input.complemento,
        },
      });
      return { ok: true as const };
    }),

  myStatus: driverProcedure.query(async ({ ctx }) => {
    const p = (ctx as AuthedContext).user.driverProfile;
    if (!p) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Perfil de motorista não encontrado",
      });
    }
    return {
      status: p.status,
      profile: p,
    };
  }),

  requestRental: driverProcedure
    .input(z.object({ vehicleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = (ctx as AuthedContext).user.driverProfile;
      if (!profile || profile.status !== "APPROVED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cadastro de motorista deve estar aprovado",
        });
      }
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: input.vehicleId, available: true },
      });
      if (!vehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Veículo indisponível",
        });
      }
      if (vehicle.ownerUserId === (ctx as AuthedContext).user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível alugar o próprio veículo",
        });
      }
      const dup = await prisma.rental.findFirst({
        where: {
          driverUserId: (ctx as AuthedContext).user.id,
          vehicleId: input.vehicleId,
          status: { in: ["PENDING_OWNER", "APPROVED", "ACTIVE"] },
        },
      });
      if (dup) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe solicitação ou locação ativa para este veículo",
        });
      }
      const driverId = (ctx as AuthedContext).user.id;
      const blocked = await isDriverBlockedFromVehicleRequest(
        input.vehicleId,
        driverId
      );
      if (blocked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "O proprietário recusou sua solicitação para este veículo. Ele precisa permitir uma nova solicitação.",
        });
      }
      const owner = await prisma.user.findUnique({
        where: { id: vehicle.ownerUserId },
        select: {
          ownerProfile: { select: { emailLocador: true, nomeRazaoSocial: true } },
        },
      });
      const rental = await prisma.rental.create({
        data: {
          vehicleId: input.vehicleId,
          driverUserId: driverId,
          status: "PENDING_OWNER",
        },
      });

      const to = owner?.ownerProfile?.emailLocador?.trim();
      if (to) {
        void sendEmail({
          to,
          subject: "Nova solicitação de locação",
          text: [
            "Você recebeu uma nova solicitação de locação.",
            "",
            `Veículo: ${vehicle.title ?? "—"} (${vehicle.plate})`,
            `Motorista: ${profile.fullName ?? "—"} (${(ctx as AuthedContext).user.email})`,
            "",
            `Rental ID: ${rental.id}`,
          ].join("\n"),
        }).catch(() => {
          /* não falha a solicitação por e-mail */
        });
      }
      return { rentalId: rental.id };
    }),

  myRentals: driverProcedure.query(async ({ ctx }) => {
    return prisma.rental.findMany({
      where: { driverUserId: (ctx as AuthedContext).user.id },
      orderBy: { requestedAt: "desc" },
      include: {
        vehicle: {
          select: {
            id: true,
            title: true,
            plate: true,
            pickupCity: true,
            pickupUf: true,
          },
        },
      },
    });
  }),

  getRentalDetail: driverProcedure
    .input(z.object({ rentalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const r = await prisma.rental.findFirst({
        where: { id: input.rentalId, driverUserId: (ctx as AuthedContext).user.id },
        include: {
          vehicle: {
            select: {
              id: true,
              title: true,
              plate: true,
              brand: true,
              model: true,
              cor: true,
              pickupCity: true,
              pickupUf: true,
              pickupCep: true,
              pickupLogradouro: true,
              pickupNumero: true,
              pickupComplemento: true,
              pickupBairro: true,
            },
          },
        },
      });
      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Locação não encontrada",
        });
      }
      return r;
    }),
});
