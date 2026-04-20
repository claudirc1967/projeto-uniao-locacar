import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { signJwt } from "../auth/jwt.js";
import type { AuthedContext } from "../context.js";
import { prisma } from "../db.js";
import { PRIVACY_POLICY_VERSION } from "../privacy.js";
import { deleteUserAccountData } from "../services/deleteUserAccount.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";
import { cpfCnpjValidationMessage } from "../validation/cpfCnpj.js";

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
  complemento: z.string().max(200),
} as const;

const signupInput = z.union([
  emailPassword.extend({
    role: z.literal("DRIVER"),
    privacyPolicyAcceptedVersion: z.literal(PRIVACY_POLICY_VERSION),
  }),
  emailPassword
    .extend({
      role: z.literal("OWNER"),
    })
    .extend(ownerSignupFields)
    .extend({
      privacyPolicyAcceptedVersion: z.literal(PRIVACY_POLICY_VERSION),
    })
    .superRefine((data, ctx) => {
      const msg = cpfCnpjValidationMessage(data.cpfCnpj);
      if (msg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg,
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
          privacyPolicyVersion: input.privacyPolicyAcceptedVersion,
          privacyPolicyAcceptedAt: new Date(),
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
                    complemento: input.complemento.trim(),
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
    const needsPrivacyPolicyAcceptance =
      !u.privacyPolicyAcceptedAt ||
      u.privacyPolicyVersion !== PRIVACY_POLICY_VERSION;
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      driverProfile: u.driverProfile,
      ownerProfile: u.ownerProfile,
      privacyPolicyVersion: u.privacyPolicyVersion,
      privacyPolicyAcceptedAt: u.privacyPolicyAcceptedAt,
      needsPrivacyPolicyAcceptance,
      currentPrivacyPolicyVersion: PRIVACY_POLICY_VERSION,
    };
  }),

  acceptPrivacyPolicy: protectedProcedure
    .input(
      z.object({
        version: z.literal(PRIVACY_POLICY_VERSION),
      })
    )
    .mutation(async ({ ctx }) => {
      const userId = (ctx as AuthedContext).user.id;
      await prisma.user.update({
        where: { id: userId },
        data: {
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
          privacyPolicyAcceptedAt: new Date(),
        },
      });
      return { ok: true as const };
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ password: z.string().min(6).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const u = (ctx as AuthedContext).user;
      if (!(await bcrypt.compare(input.password, u.passwordHash))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Senha incorreta",
        });
      }
      await deleteUserAccountData(u.id);
      return { ok: true as const };
    }),

  /** Valida token atual (útil após cold start do app). */
  pingSession: protectedProcedure.query(() => ({ ok: true as const })),
});
