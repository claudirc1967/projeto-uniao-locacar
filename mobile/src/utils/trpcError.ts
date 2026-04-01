import { TRPCClientError } from "@trpc/client";

type ZodIssueLike = { message?: string };

function messagesFromZodJsonString(message: string): string | null {
  const t = message.trim();
  if (!t.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!Array.isArray(parsed)) return null;
    const msgs = parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const m = (item as ZodIssueLike).message;
        return typeof m === "string" && m.trim() ? m.trim() : null;
      })
      .filter((x): x is string => Boolean(x));
    return msgs.length ? msgs.join(" ") : null;
  } catch {
    return null;
  }
}

function messageFromTrpcData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const z = (data as { zodError?: unknown }).zodError;
  if (!z || typeof z !== "object") return null;

  const formErrors = (z as { formErrors?: unknown }).formErrors;
  if (Array.isArray(formErrors)) {
    const msgs = formErrors.filter((x) => typeof x === "string" && x.trim());
    if (msgs.length) return msgs.join(" ");
  }

  const fieldErrors = (z as { fieldErrors?: Record<string, unknown> }).fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const parts: string[] = [];
    for (const [, val] of Object.entries(fieldErrors)) {
      if (Array.isArray(val)) {
        for (const m of val) {
          if (typeof m === "string" && m.trim()) parts.push(m.trim());
        }
      } else if (typeof val === "string" && val.trim()) {
        parts.push(val.trim());
      }
    }
    if (parts.length) return parts.join(" ");
  }

  return null;
}

export function trpcErrorMessage(err: unknown, fallback = "Algo deu errado.") {
  if (err instanceof TRPCClientError) {
    const fromData = messageFromTrpcData(err.data);
    if (fromData) return fromData;
    const fromJson = messagesFromZodJsonString(err.message);
    if (fromJson) return fromJson;
    return err.message || fallback;
  }
  if (err instanceof Error) {
    const fromJson = messagesFromZodJsonString(err.message);
    if (fromJson) return fromJson;
    return err.message;
  }
  return fallback;
}
