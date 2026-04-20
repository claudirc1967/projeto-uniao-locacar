import { TRPCClientError } from "@trpc/client";

type ZodIssueParsed = {
  code?: string;
  path?: unknown[];
  message?: string;
  minimum?: number;
  maximum?: number;
  validation?: string;
};

const FIELD_PT: Record<string, string> = {
  password: "Senha",
  email: "E-mail",
  token: "Token",
  nomeRazaoSocial: "Nome / Razão Social",
  cpfCnpj: "CPF ou CNPJ",
  cpf: "CPF",
  phone: "Telefone",
  cep: "CEP",
  logradouro: "Logradouro",
  bairro: "Bairro",
  cidade: "Cidade",
  uf: "UF",
  numero: "Número",
  complemento: "Complemento",
  role: "Perfil",
};

function fieldLabel(path: unknown[] | undefined): string {
  if (!Array.isArray(path) || path.length === 0) return "Campo";
  const last = path[path.length - 1];
  if (typeof last === "string" && FIELD_PT[last]) return FIELD_PT[last];
  return typeof last === "string" ? last : "Campo";
}

/** Converte um issue Zod em mensagem curta em português (nome do campo + problema). */
export function formatZodIssue(issue: ZodIssueParsed): string {
  const label = fieldLabel(issue.path);
  const code = issue.code;
  const lastKey =
    Array.isArray(issue.path) && issue.path.length
      ? issue.path[issue.path.length - 1]
      : undefined;

  if (code === "too_small") {
    const min = issue.minimum;
    if (typeof min === "number") {
      if (lastKey === "password" || lastKey === "token") {
        return `${label}: use pelo menos ${min} caracteres.`;
      }
      return `${label}: mínimo de ${min} caractere(s).`;
    }
  }
  if (code === "too_big") {
    const max = issue.maximum;
    if (typeof max === "number") {
      return `${label}: máximo de ${max} caractere(s).`;
    }
  }
  if (code === "invalid_string" && issue.validation === "email") {
    return `${label}: informe um endereço válido.`;
  }
  if (code === "invalid_type") {
    return `${label}: preenchimento obrigatório.`;
  }
  if (
    code === "custom" &&
    (lastKey === "cpfCnpj" || lastKey === "cpf")
  ) {
    return issue.message?.trim()
      ? `${label}: ${issue.message.trim()}`
      : `${label}: verifique o documento.`;
  }

  if (issue.message?.trim()) {
    const m = issue.message.trim();
    if (m.startsWith("String must contain") && lastKey === "password") {
      return `${label}: use pelo menos 6 caracteres.`;
    }
    if (m.includes("Invalid email") || m.toLowerCase().includes("email")) {
      return `${label}: informe um endereço válido.`;
    }
    return `${label}: ${m}`;
  }
  return `${label}: valor inválido.`;
}

function formatZodIssuesArray(issues: unknown[]): string | null {
  const msgs = issues
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return formatZodIssue(item as ZodIssueParsed);
    })
    .filter((x): x is string => Boolean(x));
  return msgs.length ? msgs.join(" ") : null;
}

function formatZodErrorObject(zodError: unknown): string | null {
  if (!zodError || typeof zodError !== "object") return null;
  const z = zodError as {
    issues?: unknown[];
    fieldErrors?: Record<string, unknown>;
    formErrors?: unknown;
  };

  if (Array.isArray(z.issues) && z.issues.length) {
    const out = formatZodIssuesArray(z.issues);
    if (out) return out;
  }

  if (z.fieldErrors && typeof z.fieldErrors === "object") {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(z.fieldErrors)) {
      const label = FIELD_PT[key] ?? key;
      const raw = Array.isArray(val) ? val[0] : val;
      if (typeof raw !== "string" || !raw.trim()) continue;
      const t = raw.trim();
      if (key === "password" && (t.includes("6") || t.includes("too_small"))) {
        parts.push(`${label}: use pelo menos 6 caracteres.`);
        continue;
      }
      if (key === "email" && (t.includes("email") || t.includes("Invalid"))) {
        parts.push(`${label}: informe um endereço válido.`);
        continue;
      }
      if (key === "token" && t.includes("10")) {
        parts.push(`${label}: informe o token completo recebido.`);
        continue;
      }
      parts.push(`${label}: ${t}`);
    }
    if (parts.length) return parts.join(" ");
  }

  const formErrors = z.formErrors;
  if (Array.isArray(formErrors)) {
    const msgs = formErrors.filter((x) => typeof x === "string" && x.trim());
    if (msgs.length) return msgs.join(" ");
  }

  return null;
}

function messagesFromZodJsonString(message: string): string | null {
  const t = message.trim();
  if (!t.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!Array.isArray(parsed)) return null;
    return formatZodIssuesArray(parsed);
  } catch {
    return null;
  }
}

function messageFromTrpcData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const z = (data as { zodError?: unknown }).zodError;
  if (z != null) {
    const fromZ = formatZodErrorObject(z);
    if (fromZ) return fromZ;
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
