import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc.js";

const cepRegex = /^\d{8}$/;

type CepAddress = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

async function lookupViaCep(digits: string): Promise<CepAddress | null> {
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    erro?: boolean;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (data.erro) return null;

  return {
    logradouro: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}

async function lookupBrasilApiCep(digits: string): Promise<CepAddress | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as {
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };

  return {
    logradouro: data.street ?? "",
    bairro: data.neighborhood ?? "",
    cidade: data.city ?? "",
    uf: data.state ?? "",
  };
}

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

      const lookups = [lookupViaCep, lookupBrasilApiCep];
      for (const lookup of lookups) {
        try {
          const address = await lookup(digits);
          if (address) return address;
        } catch {
          // Try the next provider before failing the CEP lookup.
        }
      }

      throw new TRPCError({
        code: "NOT_FOUND",
        message: "CEP não encontrado",
      });
    }),
});
