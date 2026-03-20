import { TRPCClientError } from "@trpc/client";

export function trpcErrorMessage(err: unknown, fallback = "Algo deu errado.") {
  if (err instanceof TRPCClientError) {
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
