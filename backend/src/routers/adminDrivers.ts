import { z } from "zod";
import { resolveDriverByIdentity } from "../admin/resolveDriverByIdentity.js";
import { adminProcedure, router } from "../trpc.js";

const driverIdentityInputSchema = z
  .object({
    cpf: z.string().optional(),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.cpf?.trim() && !data.phone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe CPF ou telefone do motorista.",
      });
    }
  });

export const adminDriversRouter = router({
  findByIdentity: adminProcedure
    .input(driverIdentityInputSchema)
    .query(async ({ input }) => {
      const driver = await resolveDriverByIdentity(input);
      return { driver };
    }),
});
