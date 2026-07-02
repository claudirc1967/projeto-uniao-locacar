import type { ContractTime, DriverProfile, OwnerProfile, Rental, User, Vehicle } from "@prisma/client";
import { maskCpf, maskCpfCnpj } from "../utils/masks.js";
import {
  formatCaucaoWithExtenso,
  moneyInWordsFromCents,
} from "../utils/moneyInWords.js";

/** Placeholders disponíveis para o template (.txt ou campo no perfil). Formato: {{NOME_DA_CHAVE}} */
export const RENTAL_CONTRACT_PLACEHOLDER_KEYS = [
  "RENTAL_ID",
  "LOCADOR_NOME_RAZAO",
  "LOCADOR_CPF_CNPJ",
  "LOCADOR_ENDERECO",
  "LOCADOR_TELEFONE",
  "LOCADOR_EMAIL",
  "LOCATARIO_NOME_COMPLETO",
  "LOCATARIO_CPF",
  "LOCATARIO_CNH",
  "LOCATARIO_ENDERECO",
  "LOCATARIO_TELEFONE",
  "LOCATARIO_EMAIL",
  "VEICULO_MARCA_MODELO",
  "VEICULO_ANO",
  "VEICULO_PLACA",
  "VEICULO_COR",
  "VEICULO_TITULO",
  "VALOR_LOCACAO_BRL",
  "PERIODO_COBRANCA",
  "FORMA_PAGAMENTO",
  "CAUCAO",
] as const;

export type RentalContractInput = {
  rental: Pick<Rental, "id">;
  vehicle: Pick<
    Vehicle,
    | "title"
    | "plate"
    | "brand"
    | "model"
    | "year"
    | "cor"
    | "paymentNotes"
    | "caucao"
    | "contractTime"
    | "dailyRateCents"
  >;
  owner: Pick<User, "email"> & {
    ownerProfile: Pick<
      OwnerProfile,
      | "nomeRazaoSocial"
      | "cpfCnpj"
      | "phone"
      | "logradouro"
      | "numero"
      | "complemento"
      | "bairro"
      | "cidade"
      | "uf"
      | "cep"
      | "emailLocador"
    > | null;
  };
  driver: Pick<User, "email"> & {
    driverProfile: Pick<
      DriverProfile,
      | "fullName"
      | "cpf"
      | "cnh"
      | "phone"
      | "logradouro"
      | "numero"
      | "complemento"
      | "bairro"
      | "cidade"
      | "uf"
      | "cep"
    > | null;
  };
};

function lineReplace(
  text: string,
  label: string,
  value: string | null | undefined
): string {
  if (!value?.trim()) return text;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^(${escaped}\\s*)(_+.*)$`, "m");
  return text.replace(re, `$1${value.trim()}`);
}

function replaceInSection(
  text: string,
  sectionHeader: string,
  nextHeader: string,
  replaceFn: (sectionBody: string) => string
) {
  const start = text.indexOf(sectionHeader);
  if (start < 0) return text;
  const from = start + sectionHeader.length;
  const end = text.indexOf(nextHeader, from);
  if (end < 0) return text;
  const before = text.slice(0, from);
  const body = text.slice(from, end);
  const after = text.slice(end);
  return `${before}${replaceFn(body)}${after}`;
}

function bulletReplace(text: string, label: string, value: string | null | undefined) {
  if (!value?.trim()) return text;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^(\\*\\s*${escaped}\\s*)(_+.*)$`, "m");
  return text.replace(re, `$1${value.trim()}`);
}

function contractPeriodLabel(contractTime: ContractTime | null | undefined) {
  if (contractTime === "SEMANAL") return "semana";
  if (contractTime === "MENSAL") return "mês";
  return "dia";
}

function moneyBRLFromCents(cents: number | null | undefined) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatMoneyWithExtenso(cents: number | null | undefined): string {
  if (typeof cents !== "number") return "";
  const formatted = moneyBRLFromCents(cents);
  const extenso = moneyInWordsFromCents(cents);
  return extenso ? `${formatted} (${extenso})` : formatted;
}

function ownerAddressLine(
  o: RentalContractInput["owner"]["ownerProfile"]
): string {
  if (!o) return "";
  return `${o.logradouro}, ${o.numero}${o.complemento ? ` — ${o.complemento}` : ""} — ${o.bairro} — ${o.cidade}/${o.uf} — CEP ${o.cep}`
    .replace(/\s+/g, " ")
    .trim();
}

function driverAddressLine(
  d: RentalContractInput["driver"]["driverProfile"]
): string {
  if (!d) return "";
  return `${d.logradouro ?? ""}, ${d.numero ?? ""}${d.complemento ? ` — ${d.complemento}` : ""} — ${d.bairro ?? ""} — ${d.cidade ?? ""}/${d.uf ?? ""} — CEP ${d.cep ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
}

function brandModelLine(v: Pick<Vehicle, "brand" | "model" | "title">): string {
  const s = [v.brand, v.model].filter((x) => (x ?? "").trim()).join(" / ");
  return s.trim() || v.title;
}

function buildPlaceholderMap(input: RentalContractInput): Record<string, string> {
  const o = input.owner.ownerProfile;
  const d = input.driver.driverProfile;
  const v = input.vehicle;
  const periodo = contractPeriodLabel(v.contractTime);

  return {
    RENTAL_ID: input.rental.id,
    LOCADOR_NOME_RAZAO: (o?.nomeRazaoSocial ?? "").trim(),
    LOCADOR_CPF_CNPJ: maskCpfCnpj(o?.cpfCnpj ?? ""),
    LOCADOR_ENDERECO: ownerAddressLine(o),
    LOCADOR_TELEFONE: (o?.phone ?? "").trim(),
    LOCADOR_EMAIL: (o?.emailLocador ?? input.owner.email ?? "").trim(),
    LOCATARIO_NOME_COMPLETO: (d?.fullName ?? "").trim(),
    LOCATARIO_CPF: maskCpf(d?.cpf ?? ""),
    LOCATARIO_CNH: (d?.cnh ?? "").trim(),
    LOCATARIO_ENDERECO: driverAddressLine(d),
    LOCATARIO_TELEFONE: (d?.phone ?? "").trim(),
    LOCATARIO_EMAIL: (input.driver.email ?? "").trim(),
    VEICULO_MARCA_MODELO: brandModelLine(v),
    VEICULO_ANO: v.year != null ? String(v.year) : "",
    VEICULO_PLACA: (v.plate ?? "").trim(),
    VEICULO_COR: (v.cor ?? "").trim(),
    VEICULO_TITULO: (v.title ?? "").trim(),
    VALOR_LOCACAO_BRL: formatMoneyWithExtenso(v.dailyRateCents),
    PERIODO_COBRANCA: periodo,
    FORMA_PAGAMENTO: (v.paymentNotes ?? "").trim(),
    CAUCAO: formatCaucaoWithExtenso(v.caucao),
  };
}

function applyPlaceholders(template: string, input: RentalContractInput): string {
  const map = buildPlaceholderMap(input);
  return template.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_full, key: string) => {
    const v = map[key];
    return v !== undefined ? v : "";
  });
}

/** Formato antigo (texto fixo com **LOCADOR:** / linhas com sublinhados). */
function applyLegacyFillForOldFormat(template: string, input: RentalContractInput): string {
  let out = template;

  const o = input.owner.ownerProfile;
  const d = input.driver.driverProfile;

  out = replaceInSection(out, "**LOCADOR:**", "**LOCATÁRIO:**", (section) => {
    let s = section;
    s = lineReplace(s, "Nome/Razão Social:", o?.nomeRazaoSocial ?? null);
    s = lineReplace(s, "CPF/CNPJ:", o?.cpfCnpj ? maskCpfCnpj(o.cpfCnpj) : null);
    s = lineReplace(
      s,
      "Endereço:",
      o
        ? `${o.logradouro}, ${o.numero}${o.complemento ? ` — ${o.complemento}` : ""} — ${o.bairro} — ${o.cidade}/${o.uf} — CEP ${o.cep}`
        : null
    );
    s = lineReplace(s, "Telefone:", o?.phone ?? null);
    s = lineReplace(s, "E-mail:", o?.emailLocador ?? input.owner.email);
    return s;
  });

  out = replaceInSection(
    out,
    "**LOCATÁRIO:**",
    "As partes acima identificadas",
    (section) => {
      let s = section;
      s = lineReplace(s, "Nome Completo:", d?.fullName ?? null);
      s = lineReplace(s, "CPF:", d?.cpf ? maskCpf(d.cpf) : null);
      s = lineReplace(s, "CNH:", d?.cnh ?? null);
      s = lineReplace(
        s,
        "Endereço:",
        d
          ? `${d.logradouro ?? ""}, ${d.numero ?? ""}${d.complemento ? ` — ${d.complemento}` : ""} — ${d.bairro ?? ""} — ${d.cidade ?? ""}/${d.uf ?? ""} — CEP ${d.cep ?? ""}`
              .replace(/\s+/g, " ")
              .trim()
          : null
      );
      s = lineReplace(s, "Telefone:", d?.phone ?? null);
      s = lineReplace(s, "E-mail:", input.driver.email ?? null);
      return s;
    }
  );

  const brandModel =
    [input.vehicle.brand, input.vehicle.model].filter((s) => (s ?? "").trim()).join(" / ") ||
    input.vehicle.title;
  out = bulletReplace(out, "Marca/Modelo:", brandModel);
  out = bulletReplace(out, "Ano:", input.vehicle.year != null ? String(input.vehicle.year) : null);
  out = bulletReplace(out, "Placa:", input.vehicle.plate);
  out = bulletReplace(out, "Cor:", input.vehicle.cor ?? null);

  const value = formatMoneyWithExtenso(input.vehicle.dailyRateCents);
  if (value) {
    out = out.replace(
      /O LOCATÁRIO pagará ao LOCADOR o valor de R\$ __________ por \(semana\/mês\), mediante:/,
      `O LOCATÁRIO pagará ao LOCADOR o valor de R$ ${value} por ${contractPeriodLabel(input.vehicle.contractTime)}, mediante:`
    );
  }

  if (input.vehicle.paymentNotes?.trim()) {
    out = out.replace(
      /\( \) PIX[\s\S]*?\( \) Outro: ___________________________________/m,
      `Forma de pagamento (conforme acordado): ${input.vehicle.paymentNotes.trim()}`
    );
  }

  if (input.vehicle.caucao?.trim()) {
    out = out.replace(
      "### **CLÁUSULA 3 – DO VALOR E FORMA DE PAGAMENTO**",
      `### **CLÁUSULA 3 – DO VALOR E FORMA DE PAGAMENTO**\n\nCaução (conforme acordado): ${formatCaucaoWithExtenso(input.vehicle.caucao)}`
    );
  }

  return out;
}

function isLegacyTemplateFormat(text: string): boolean {
  return text.includes("**LOCADOR:**") && text.includes("**LOCATÁRIO:**");
}

export function fillRentalContract(template: string, input: RentalContractInput): string {
  let out = applyPlaceholders(template, input);
  if (isLegacyTemplateFormat(out)) {
    out = applyLegacyFillForOldFormat(out, input);
  }
  return out.trimEnd() + "\n";
}
