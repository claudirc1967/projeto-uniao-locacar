import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthedContext } from "../context.js";
import { isDriverBlockedFromVehicleRequest } from "../driverVehicleBlock.js";
import { prisma } from "../db.js";
import { sendEmail } from "../email/consoleEmail.js";
import { rentalRequestedEmail } from "../email/templates.js";
import {
  rentalRequestedWhatsApp,
  sendWhatsApp,
} from "../whatsapp/sendWhatsApp.js";
import { driverProcedure, router } from "../trpc.js";
import { cpfValidationMessage } from "../validation/cpfCnpj.js";

export const driverRouter = router({
  completePreRegistration: driverProcedure
    .input(
      z
        .object({
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
        .superRefine((data, ctx) => {
          const msg = cpfValidationMessage(data.cpf);
          if (msg) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: msg,
              path: ["cpf"],
            });
          }
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
          cpf: input.cpf.replace(/\D/g, ""),
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
          complemento: input.complemento?.trim() ?? "",
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
          email: true,
          ownerProfile: {
            select: { emailLocador: true, nomeRazaoSocial: true, phone: true },
          },
        },
      });
      const rental = await prisma.rental.create({
        data: {
          vehicleId: input.vehicleId,
          driverUserId: driverId,
          status: "PENDING_OWNER",
        },
      });

      const ownerEmail =
        owner?.ownerProfile?.emailLocador?.trim() || owner?.email?.trim();
      if (ownerEmail) {
        const email = rentalRequestedEmail({
          owner: {
            name: owner?.ownerProfile?.nomeRazaoSocial,
            phone: owner?.ownerProfile?.phone,
            email: ownerEmail,
          },
          driver: {
            name: profile.fullName,
            phone: profile.phone,
            email: (ctx as AuthedContext).user.email,
          },
          vehicle,
        });
        void sendEmail({ to: ownerEmail, ...email }).catch(() => {
          /* não falha a solicitação por e-mail */
        });
      }
      const ownerPhone = owner?.ownerProfile?.phone;
      if (ownerPhone) {
        const whatsapp = rentalRequestedWhatsApp({
          owner: {
            name: owner?.ownerProfile?.nomeRazaoSocial,
          },
          driver: {
            name: profile.fullName,
            phone: profile.phone,
            email: (ctx as AuthedContext).user.email,
          },
          vehicle,
        });
        void sendWhatsApp({ to: ownerPhone, ...whatsapp }).catch(() => {
          /* não falha a solicitação por WhatsApp */
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
              portas: true,
              lugares: true,
              owner: {
                select: {
                  email: true,
                  ownerProfile: {
                    select: {
                      nomeRazaoSocial: true,
                      phone: true,
                    },
                  },
                },
              },
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

      const myReview = await prisma.rentalReview.findUnique({
        where: {
          rentalId_direction: {
            rentalId: r.id,
            direction: "DRIVER_TO_OWNER",
          },
        },
      });

      const tagsFromJson = (json: unknown): string[] => {
        if (json == null) return [];
        if (Array.isArray(json)) {
          return json.filter((x): x is string => typeof x === "string");
        }
        return [];
      };

      return {
        ...r,
        review: {
          canSubmit: r.status === "COMPLETED" && !myReview,
          submitted: myReview
            ? {
                stars: myReview.stars,
                tags: tagsFromJson(myReview.tagsJson),
                comment: myReview.comment,
                createdAt: myReview.createdAt,
              }
            : null,
        },
      };
    }),
});
