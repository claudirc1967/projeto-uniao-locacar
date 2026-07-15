import type { DriverProfile, OwnerProfile, User } from "@prisma/client";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyJwt } from "./auth/jwt.js";
import { prisma } from "./db.js";

/** Perfil do locador no contexto de sessão — sem texto do contrato (payload grande). */
export type SessionOwnerProfile = Omit<OwnerProfile, "contractTemplateText">;

export type AuthedUser = User & {
  ownerProfile: SessionOwnerProfile | null;
  driverProfile: DriverProfile | null;
};

export type Context = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  userId: string | null;
  token: string | null;
};

/** Contexto após `protectedProcedure` (JWT válido + usuário carregado). */
export type AuthedContext = Omit<Context, "userId"> & {
  userId: string;
  user: AuthedUser;
};

type RequestWithSessionCache = CreateExpressContextOptions["req"] & {
  __sessionUserCache?: {
    user?: AuthedUser | null;
    promise?: Promise<AuthedUser | null>;
  };
};

const sessionUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  role: true,
  createdAt: true,
  privacyPolicyVersion: true,
  privacyPolicyAcceptedAt: true,
  termsOfUseVersion: true,
  termsOfUseAcceptedAt: true,
  ownerProfile: {
    select: {
      id: true,
      userId: true,
      nomeRazaoSocial: true,
      emailLocador: true,
      cpfCnpj: true,
      phone: true,
      cep: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      uf: true,
      averageRating: true,
      ratingCount: true,
    },
  },
  driverProfile: true,
} as const;

async function loadSessionUser(userId: string): Promise<AuthedUser | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: sessionUserSelect,
  });
  return u as AuthedUser | null;
}

/**
 * Carrega o usuário no máximo uma vez por request HTTP (deduplica batch tRPC).
 */
export async function resolveSessionUser(
  req: CreateExpressContextOptions["req"],
  userId: string
): Promise<AuthedUser | null> {
  const r = req as RequestWithSessionCache;
  if (!r.__sessionUserCache) {
    r.__sessionUserCache = {};
  }
  const cache = r.__sessionUserCache;
  if (cache.user !== undefined) {
    return cache.user;
  }
  if (!cache.promise) {
    cache.promise = loadSessionUser(userId).then((user) => {
      cache.user = user;
      return user;
    });
  }
  return cache.promise;
}

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  const header = req.headers.authorization;
  const token =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7)
      : null;
  let userId: string | null = null;
  if (token) {
    try {
      const payload = verifyJwt(token);
      userId = payload.sub;
    } catch {
      userId = null;
    }
  }
  return { req, res, userId, token };
}

/** @deprecated Use resolveSessionUser — mantido para testes internos se necessário. */
export async function loadUser(userId: string): Promise<AuthedUser | null> {
  return loadSessionUser(userId);
}

export async function loadOwnerContractTemplateText(
  userId: string
): Promise<string | null> {
  const row = await prisma.ownerProfile.findUnique({
    where: { userId },
    select: { contractTemplateText: true },
  });
  return row?.contractTemplateText ?? null;
}
