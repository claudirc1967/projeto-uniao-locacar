import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc.js";

const cepRegex = /^\d{8}$/;

export const addressRouter = router({
  lookupCep: publicProcedure
    .input(z.object({ cep: z.string().min(8).max(9) }))
    .query(async ({ input }) => {
      const digits = input.cep.replace(/\D/g, "");
      if (!cepRegex.test(digits)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CEP inválido",
        });
      }
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao consultar CEP",
        });
      }
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CEP não encontrado",
        });
      }
      return {
        logradouro: data.logradouro ?? "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        uf: data.uf ?? "",
      };
    }),
});
