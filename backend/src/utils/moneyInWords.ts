const UNITS = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const HUNDREDS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function joinParts(parts: string[]) {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0]!;
  if (filtered.length === 2) return `${filtered[0]} e ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")} e ${filtered[filtered.length - 1]}`;
}

function under1000(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  if (n < 20) return UNITS[n]!;
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    return unit ? `${TENS[ten]!} e ${UNITS[unit]!}` : TENS[ten]!;
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (!rest) return HUNDREDS[hundred]!;
  return `${HUNDREDS[hundred]!} e ${under1000(rest)}`;
}

function integerInWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];

  const millions = Math.floor(n / 1_000_000);
  if (millions) {
    parts.push(
      millions === 1 ? "um milhão" : `${integerInWords(millions)} milhões`
    );
    n %= 1_000_000;
  }

  const thousands = Math.floor(n / 1000);
  if (thousands) {
    parts.push(thousands === 1 ? "mil" : `${under1000(thousands)} mil`);
    n %= 1000;
  }

  if (n) parts.push(under1000(n));
  return joinParts(parts);
}

/** Valor monetário em reais por extenso (minúsculas, estilo contrato). */
export function moneyInWordsFromCents(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) return "";
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;

  const reaisText =
    reais === 1 ? "um real" : `${integerInWords(reais)} reais`;

  if (centavos === 0) return reaisText;

  const centavosText =
    centavos === 1
      ? "um centavo"
      : `${integerInWords(centavos)} centavos`;

  return `${reaisText} e ${centavosText}`;
}

/** Valor formatado em reais (pt-BR), ex.: R$ 1.500,00 */
export function formatMoneyBRLFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Detecta valor já mascarado (ex.: R$ 1.500,00 ou 1.500,00). */
export function isBrazilianMoneyMasked(raw: string): boolean {
  const trimmed = raw.trim();
  return (
    /^R\$\s*\d{1,3}(\.\d{3})*,\d{2}$/i.test(trimmed) ||
    /^\d{1,3}(\.\d{3})*,\d{2}$/.test(trimmed)
  );
}

/** Caução: mantém máscara existente; aplica R$ quando for só número; acrescenta extenso. */
export function formatCaucaoWithExtenso(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const cents = tryParseMoneyCentsFromText(trimmed);
  if (cents === null) return trimmed;
  const extenso = moneyInWordsFromCents(cents);
  if (!extenso) return trimmed;
  if (isBrazilianMoneyMasked(trimmed)) {
    return `${trimmed} (${extenso})`;
  }
  return `${formatMoneyBRLFromCents(cents)} (${extenso})`;
}

/** Tenta extrair centavos de texto livre (ex.: "R$ 500,00", "500"). */
export function tryParseMoneyCentsFromText(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (/^\d+(\.\d{1,2})?$/.test(normalized)) {
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100);
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (/[a-zA-ZÀ-ú]/.test(trimmed.replace(/R\$/gi, ""))) return null;
  return Number(digits) * 100;
}
