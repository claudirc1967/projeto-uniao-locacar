import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { signJwt } from "../auth/jwt.js";
import type { AuthedContext } from "../context.js";
import { prisma } from "../db.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

const emailPassword = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const ownerSignupFields = {
  nomeRazaoSocial: z.string().min(1),
  cpfCnpj: z.string().min(11).max(18),
  phone: z.string().min(8).max(20),
  cep: z.string().min(8).max(9),
  logradouro: z.string().min(1),
  bairro: z.string().min(1),
  cidade: z.string().min(1),
  uf: z.string().length(2),
  numero: z.string().min(1),
  complemento: z.string().min(1),
} as const;

const signupInput = z.union([
  emailPassword.extend({
    role: z.literal("DRIVER"),
  }),
  emailPassword
    .extend({
      role: z.literal("OWNER"),
    })
    .extend(ownerSignupFields)
    .superRefine((data, ctx) => {
      const d = data.cpfCnpj.replace(/\D/g, "");
      if (d.length !== 11 && d.length !== 14) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CPF deve ter 11 dígitos ou CNPJ 14 dígitos",
          path: ["cpfCnpj"],
        });
      }
    }),
]);

export const authRouter = router({
  signup: publicProcedure.input(signupInput).mutation(async ({ input }) => {
      const exists = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "E-mail já cadastrado",
        });
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: input.role,
          ...(input.role === "OWNER"
            ? {
                ownerProfile: {
                  create: {
                    nomeRazaoSocial: input.nomeRazaoSocial.trim(),
                    emailLocador: input.email.toLowerCase(),
                    contractTemplateText: null,
                    cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
                    phone: input.phone,
                    cep: input.cep.replace(/\D/g, ""),
                    logradouro: input.logradouro,
                    bairro: input.bairro,
                    cidade: input.cidade,
                    uf: input.uf.toUpperCase(),
                    numero: input.numero,
                    complemento: input.complemento,
                  },
                },
              }
            : { driverProfile: { create: { status: "PENDING" } } }),
        },
      });
      const token = signJwt({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      return { token, user: { id: user.id, email: user.email, role: user.role } };
  }),

  login: publicProcedure.input(emailPassword).mutation(async ({ input }) => {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "E-mail ou senha inválidos",
      });
    }
    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { token, user: { id: user.id, email: user.email, role: user.role } };
  }),

  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (!user) {
        return { ok: true as const };
      }
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });
      // Em produção: enviar e-mail. Aqui retornamos o token só em dev.
      if (process.env.NODE_ENV !== "production") {
        return { ok: true as const, devResetToken: token };
      }
      return { ok: true as const };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        password: z.string().min(6).max(128),
      })
    )
    .mutation(async ({ input }) => {
      const row = await prisma.passwordResetToken.findUnique({
        where: { token: input.token },
      });
      if (!row || row.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido ou expirado",
        });
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: row.userId },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.delete({ where: { id: row.id } }),
      ]);
      return { ok: true as const };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const u = (ctx as AuthedContext).user;
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      driverProfile: u.driverProfile,
      ownerProfile: u.ownerProfile,
    };
  }),

  /** Valida token atual (útil após cold start do app). */
  pingSession: protectedProcedure.query(() => ({ ok: true as const })),
});
