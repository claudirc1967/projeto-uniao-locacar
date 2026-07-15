import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { resolveOwnerByIdentity } from "../admin/resolveOwnerByIdentity.js";
import { prisma } from "../db.js";
import { notifyAdminWhatsAppRelay } from "../email/adminNotify.js";
import { sendEmail } from "../email/consoleEmail.js";
import { rentalRejectedEmail } from "../email/templates.js";
import {
  rentalRejectedWhatsApp,
  sendWhatsApp,
} from "../whatsapp/sendWhatsApp.js";
import { adminProcedure, router } from "../trpc.js";

const DEFAULT_ADMIN_REJECT_REASON =
  "Locador não respondeu no prazo. A solicitação foi encerrada pela plataforma.";

const ownerIdentityInputSchema = z
  .object({
    cpfCnpj: z.string().optional(),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.cpfCnpj?.trim() && !data.phone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe CPF/CNPJ ou telefone do locador.",
      });
    }
  });

const driverProfileDetailSelect = {
  fullName: true,
  phone: true,
  cpf: true,
  cnh: true,
  cnhCategory: true,
  cnhValidity: true,
  cnhYears: true,
  cnhHasEar: true,
  criminalAttestation: true,
  uberRegistered: true,
  cep: true,
  logradouro: true,
  numero: true,
  complemento: true,
  bairro: true,
  cidade: true,
  uf: true,
} as const;

export const adminRentalsRouter = router({
  listByOwnerIdentity: adminProcedure
    .input(ownerIdentityInputSchema)
    .query(async ({ input }) => {
      const owner = await resolveOwnerByIdentity(input);

      const rentals = await prisma.rental.findMany({
        where: { vehicle: { ownerUserId: owner.ownerUserId } },
        orderBy: { requestedAt: "desc" },
        include: {
          vehicle: { select: { id: true, title: true, plate: true } },
          driver: {
            select: {
              email: true,
              driverProfile: { select: { fullName: true } },
            },
          },
        },
      });

      return {
        owner,
        rentals: rentals.map((r) => ({
          rentalId: r.id,
          status: r.status,
          requestedAt: r.requestedAt,
          rejectedByAdmin: r.rejectedByAdmin,
          vehicle: r.vehicle,
          driverName: r.driver.driverProfile?.fullName?.trim() || null,
          driverEmail: r.driver.email,
        })),
      };
    }),

  /**
   * Solicitações ainda aguardando o locador há pelo menos `olderThanHours` horas
   * (padrão 24). Usado na fila operacional do admin.
   */
  listPendingOlderThan: adminProcedure
    .input(
      z
        .object({
          olderThanHours: z.number().int().min(1).max(168).default(24),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const hours = input?.olderThanHours ?? 24;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

      const rentals = await prisma.rental.findMany({
        where: {
          status: "PENDING_OWNER",
          requestedAt: { lte: cutoff },
        },
        orderBy: { requestedAt: "asc" },
        include: {
          vehicle: {
            select: {
              id: true,
              title: true,
              plate: true,
              ownerUserId: true,
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
            },
          },
          driver: {
            select: {
              email: true,
              driverProfile: { select: { fullName: true, phone: true } },
            },
          },
        },
      });

      return {
        olderThanHours: hours,
        count: rentals.length,
        rentals: rentals.map((r) => {
          const ownerProfile = r.vehicle.owner.ownerProfile;
          return {
            rentalId: r.id,
            status: r.status,
            requestedAt: r.requestedAt,
            hoursWaiting: Math.floor(
              (Date.now() - r.requestedAt.getTime()) / (60 * 60 * 1000)
            ),
            vehicle: {
              id: r.vehicle.id,
              title: r.vehicle.title,
              plate: r.vehicle.plate,
            },
            owner: {
              ownerUserId: r.vehicle.ownerUserId,
              email: r.vehicle.owner.email,
              nomeRazaoSocial: ownerProfile?.nomeRazaoSocial?.trim() || null,
              phone: ownerProfile?.phone || null,
            },
            driverName: r.driver.driverProfile?.fullName?.trim() || null,
            driverEmail: r.driver.email,
            driverPhone: r.driver.driverProfile?.phone || null,
          };
        }),
      };
    }),

  countPendingOlderThan: adminProcedure
    .input(
      z
        .object({
          olderThanHours: z.number().int().min(1).max(168).default(24),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const hours = input?.olderThanHours ?? 24;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      const count = await prisma.rental.count({
        where: {
          status: "PENDING_OWNER",
          requestedAt: { lte: cutoff },
        },
      });
      return { olderThanHours: hours, count };
    }),

  getDetail: adminProcedure
    .input(z.object({ rentalId: z.string().min(1) }))
    .query(async ({ input }) => {
      const r = await prisma.rental.findUnique({
        where: { id: input.rentalId },
        include: {
          vehicle: {
            select: {
              title: true,
              plate: true,
              brand: true,
              model: true,
              year: true,
              cor: true,
              vehicleType: true,
              portas: true,
              lugares: true,
              ownerUserId: true,
              owner: {
                select: {
                  email: true,
                  ownerProfile: {
                    select: {
                      nomeRazaoSocial: true,
                      phone: true,
                      emailLocador: true,
                    },
                  },
                },
              },
            },
          },
          driver: {
            select: {
              email: true,
              driverProfile: { select: driverProfileDetailSelect },
            },
          },
        },
      });

      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      const ownerProfile = r.vehicle.owner.ownerProfile;

      return {
        rentalId: r.id,
        status: r.status,
        requestedAt: r.requestedAt,
        motivoRecusa: r.motivoRecusa,
        rejectedByAdmin: r.rejectedByAdmin,
        vehicle: {
          title: r.vehicle.title,
          plate: r.vehicle.plate,
          brand: r.vehicle.brand,
          model: r.vehicle.model,
          year: r.vehicle.year,
          cor: r.vehicle.cor,
          vehicleType: r.vehicle.vehicleType,
          portas: r.vehicle.portas,
          lugares: r.vehicle.lugares,
        },
        owner: {
          ownerUserId: r.vehicle.ownerUserId,
          email: r.vehicle.owner.email,
          nomeRazaoSocial: ownerProfile?.nomeRazaoSocial?.trim() || null,
          phone: ownerProfile?.phone || null,
          emailLocador: ownerProfile?.emailLocador?.trim() || null,
        },
        driver: {
          email: r.driver.email,
          driverProfile: r.driver.driverProfile,
        },
      };
    }),

  /**
   * Recusa operacional em nome da plataforma (ex.: locador sem resposta).
   * Não bloqueia o motorista no veículo — ele pode solicitar de novo.
   */
  rejectRental: adminProcedure
    .input(
      z.object({
        rentalId: z.string().min(1),
        motivoRecusa: z.string().min(3).max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const motivo =
        input.motivoRecusa?.trim() || DEFAULT_ADMIN_REJECT_REASON;

      const r = await prisma.rental.findFirst({
        where: {
          id: input.rentalId,
          status: "PENDING_OWNER",
        },
        include: {
          driver: { select: { email: true, driverProfile: true } },
          vehicle: {
            select: {
              brand: true,
              model: true,
              year: true,
              plate: true,
              cor: true,
              owner: {
                select: {
                  email: true,
                  ownerProfile: {
                    select: {
                      nomeRazaoSocial: true,
                      phone: true,
                      emailLocador: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!r) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação pendente não encontrada",
        });
      }

      await prisma.rental.update({
        where: { id: r.id },
        data: {
          status: "REJECTED",
          motivoRecusa: motivo,
          rejectedByAdmin: true,
        },
      });

      const ownerProfile = r.vehicle.owner.ownerProfile;
      const ownerForNotify = {
        name: ownerProfile?.nomeRazaoSocial,
        phone: ownerProfile?.phone,
        email: ownerProfile?.emailLocador ?? r.vehicle.owner.email,
      };

      const to = r.driver.email?.trim();
      if (to) {
        const email = rentalRejectedEmail({
          driver: { name: r.driver.driverProfile?.fullName },
          owner: ownerForNotify,
          vehicle: r.vehicle,
          rejectionReason: motivo,
        });
        void sendEmail({ to, ...email }).catch(() => {
          /* não falha a recusa por e-mail */
        });
      }

      const driverPhone = r.driver.driverProfile?.phone;
      const rentalRejectedMessage = rentalRejectedWhatsApp({
        driver: { name: r.driver.driverProfile?.fullName },
        owner: ownerForNotify,
        vehicle: r.vehicle,
        rejectionReason: motivo,
      });
      if (driverPhone) {
        void sendWhatsApp({ to: driverPhone, ...rentalRejectedMessage }).catch(
          () => {
            /* não falha a recusa por WhatsApp */
          }
        );
      }
      void notifyAdminWhatsAppRelay({
        event: "Locação encerrada pelo admin (sem resposta do locador)",
        recipientName: r.driver.driverProfile?.fullName,
        recipientPhone: driverPhone,
        message: rentalRejectedMessage,
      }).catch(() => {
        /* não falha a recusa por aviso admin */
      });

      return { ok: true as const };
    }),
});
