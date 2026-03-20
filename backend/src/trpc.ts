import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { AuthedContext, Context } from "./context.js";
import { loadUser } from "./context.js";

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
  }
  const user = await loadUser(ctx.userId);
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário inválido" });
  }
  const authed: AuthedContext = {
    ...ctx,
    userId: ctx.userId,
    user,
  };
  return next({ ctx: authed });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireOwner = t.middleware(async ({ ctx, next }) => {
  const c = ctx as AuthedContext;
  if (c.user.role !== "OWNER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas proprietários",
    });
  }
  return next({ ctx: c });
});

const requireDriver = t.middleware(async ({ ctx, next }) => {
  const c = ctx as AuthedContext;
  if (c.user.role !== "DRIVER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas motoristas",
    });
  }
  return next({ ctx: c });
});

export const ownerProcedure = protectedProcedure.use(requireOwner);
export const driverProcedure = protectedProcedure.use(requireDriver);
