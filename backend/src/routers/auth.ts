import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { signJwt } from "../auth/jwt.js";
import type { AuthedContext } from "../context.js";
import { prisma } from "../db.js";
import { notifyAdminWhatsAppRelay } from "../email/adminNotify.js";
import { sendEmail } from "../email/consoleEmail.js";
import { ownerWelcomeEmail, passwordResetEmail } from "../email/templates.js";
import { ownerWelcomeWhatsApp, sendWhatsApp } from "../whatsapp/sendWhatsApp.js";
import { PRIVACY_POLICY_VERSION } from "../privacy.js";
import { TERMS_OF_USE_VERSION } from "../terms.js";
import { deleteUserAccountData } from "../services/deleteUserAccount.js";
import { getPublicSupportConfig } from "../support/publicSupport.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";
import { cpfCnpjValidationMessage } from "../validation/cpfCnpj.js";
import {
  assertUniqueCpfCnpj,
  assertUniquePhone,
  rethrowUniqueIdentityError,
} from "../validation/uniqueIdentity.js";

const PASSWORD_RESET_EXPIRES_IN_MINUTES = 60;

const emailPassword = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

function buildPasswordResetLink(token: string): string | undefined {
  const configured = process.env.PASSWORD_RESET_URL?.trim();
  if (!configured) return undefined;

  if (configured.includes("{{token}}")) {
    return configured.replaceAll("{{token}}", encodeURIComponent(token));
  }

  try {
    const url = new URL(configured);
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return undefined;
  }
}

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

const legalAcceptanceFields = {
  privacyPolicyAcceptedVersion: z.literal(PRIVACY_POLICY_VERSION),
  termsOfUseAcceptedVersion: z.literal(TERMS_OF_USE_VERSION),
} as const;

const signupInput = z.union([
  emailPassword.extend({
    role: z.literal("DRIVER"),
    ...legalAcceptanceFields,
  }),
  emailPassword
    .extend({
      role: z.literal("OWNER"),
    })
    .extend(ownerSignupFields)
    .extend(legalAcceptanceFields)
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
          message: "E-mail já existe em nosso cadastrado. Verifique se você já possui uma conta.",
        });
      }
      let ownerCpfCnpj: string | undefined;
      let ownerPhone: string | undefined;
      if (input.role === "OWNER") {
        ownerCpfCnpj = await assertUniqueCpfCnpj(input.cpfCnpj);
        ownerPhone = await assertUniquePhone(input.phone);
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      let user;
      try {
        user = await prisma.user.create({
          data: {
            email: input.email.toLowerCase(),
            passwordHash,
            role: input.role,
            privacyPolicyVersion: input.privacyPolicyAcceptedVersion,
            privacyPolicyAcceptedAt: new Date(),
            termsOfUseVersion: input.termsOfUseAcceptedVersion,
            termsOfUseAcceptedAt: new Date(),
            ...(input.role === "OWNER"
              ? {
                  ownerProfile: {
                    create: {
                      nomeRazaoSocial: input.nomeRazaoSocial.trim(),
                      emailLocador: input.email.toLowerCase(),
                      contractTemplateText: null,
                      cpfCnpj: ownerCpfCnpj!,
                      phone: ownerPhone!,
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
      } catch (error) {
        rethrowUniqueIdentityError(error);
      }
      if (input.role === "OWNER") {
        const ownerName = input.nomeRazaoSocial.trim();
        const ownerWelcomeMessage = ownerWelcomeWhatsApp({
          owner: { name: ownerName },
        });
        void sendEmail({
          to: user.email,
          ...ownerWelcomeEmail({ owner: { name: ownerName } }),
        }).catch(() => {
          /* não falha o cadastro por e-mail */
        });
        void sendWhatsApp({
          to: ownerPhone!,
          ...ownerWelcomeMessage,
        }).catch(() => {
          /* não falha o cadastro por WhatsApp */
        });
        void notifyAdminWhatsAppRelay({
          event: "Cadastro de locador (boas-vindas)",
          recipientName: ownerName,
          recipientPhone: ownerPhone!,
          message: ownerWelcomeMessage,
        }).catch(() => {
          /* não falha o cadastro por aviso admin */
        });
      }

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
      const expiresAt = new Date(
        Date.now() + 1000 * 60 * PASSWORD_RESET_EXPIRES_IN_MINUTES
      );
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: { userId: user.id, token, expiresAt },
        }),
      ]);

      if (process.env.NODE_ENV !== "production") {
        return { ok: true as const, devResetToken: token };
      }

      const email = passwordResetEmail({
        token,
        expiresInMinutes: PASSWORD_RESET_EXPIRES_IN_MINUTES,
        resetLink: buildPasswordResetLink(token),
      });
      await sendEmail({ to: user.email, ...email }).catch(() => undefined);

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
    const needsTermsOfUseAcceptance =
      !u.termsOfUseAcceptedAt || u.termsOfUseVersion !== TERMS_OF_USE_VERSION;
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
      termsOfUseVersion: u.termsOfUseVersion,
      termsOfUseAcceptedAt: u.termsOfUseAcceptedAt,
      needsTermsOfUseAcceptance,
      currentTermsOfUseVersion: TERMS_OF_USE_VERSION,
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

  acceptTermsOfUse: protectedProcedure
    .input(
      z.object({
        version: z.literal(TERMS_OF_USE_VERSION),
      })
    )
    .mutation(async ({ ctx }) => {
      const userId = (ctx as AuthedContext).user.id;
      await prisma.user.update({
        where: { id: userId },
        data: {
          termsOfUseVersion: TERMS_OF_USE_VERSION,
          termsOfUseAcceptedAt: new Date(),
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

  /** Contato de suporte exibido na login (público, sem JWT). */
  getPublicSupport: publicProcedure.query(() => getPublicSupportConfig()),
});
