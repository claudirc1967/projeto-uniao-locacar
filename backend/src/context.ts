import type { DriverProfile, OwnerProfile, User } from "@prisma/client";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyJwt } from "./auth/jwt.js";
import { prisma } from "./db.js";

export type Context = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  userId: string | null;
  token: string | null;
};

export type AuthedUser = User & {
  ownerProfile: OwnerProfile | null;
  driverProfile: DriverProfile | null;
};

/** Contexto após `protectedProcedure` (JWT válido + usuário carregado). */
export type AuthedContext = Omit<Context, "userId"> & {
  userId: string;
  user: AuthedUser;
};

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

export async function loadUser(userId: string): Promise<AuthedUser | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: { ownerProfile: true, driverProfile: true },
  });
  return u as AuthedUser | null;
}
