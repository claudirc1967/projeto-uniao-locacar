import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { resolveOwnerByIdentity } from "../admin/resolveOwnerByIdentity.js";
import { prisma } from "../db.js";
import { adminProcedure, router } from "../trpc.js";

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
          vehicle: r.vehicle,
          driverName: r.driver.driverProfile?.fullName?.trim() || null,
          driverEmail: r.driver.email,
        })),
      };
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

      return {
        rentalId: r.id,
        status: r.status,
        requestedAt: r.requestedAt,
        vehicle: r.vehicle,
        driver: {
          email: r.driver.email,
          driverProfile: r.driver.driverProfile,
        },
      };
    }),
});
