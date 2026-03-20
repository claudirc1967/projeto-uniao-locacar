export function maskCep(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function cepDigits(masked: string) {
  return masked.replace(/\D/g, "");
}

export function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function formatCpfDigits(digits: string) {
  const d = digits.slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  if (d.length <= 3) return p1;
  if (d.length <= 6) return `${p1}.${p2}`;
  if (d.length <= 9) return `${p1}.${p2}.${p3}`;
  return `${p1}.${p2}.${p3}-${p4}`;
}

function formatCnpjDigits(digits: string) {
  const d = digits.slice(0, 14);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 8);
  const p4 = d.slice(8, 12);
  const p5 = d.slice(12, 14);
  if (d.length <= 2) return p1;
  if (d.length <= 5) return `${p1}.${p2}`;
  if (d.length <= 8) return `${p1}.${p2}.${p3}`;
  if (d.length <= 12)
    return `${p1}.${p2}.${p3}/${d.slice(8, 11)}${d.slice(11, 12)}`;
  return `${p1}.${p2}.${p3}/${p4}-${p5}`;
}

/** Máscara genérica CPF/CNPJ (detecta por quantidade de dígitos). */
export function maskCpfCnpj(raw: string) {
  const d = onlyDigits(raw);
  return d.length <= 11 ? formatCpfDigits(d) : formatCnpjDigits(d);
}

/** Máscara específica CPF. */
export function maskCpf(raw: string) {
  return formatCpfDigits(onlyDigits(raw));
}

/** Máscara específica CNPJ. */
export function maskCnpj(raw: string) {
  return formatCnpjDigits(onlyDigits(raw));
}

export function maskPhone(raw: string) {
  const d = onlyDigits(raw).slice(0, 11);
  const dd = d.slice(0, 2);
  const rest = d.slice(2);

  if (d.length <= 2) return dd;
  if (d.length <= 6) return `(${dd}) ${rest}`;

  if (d.length === 11) {
    const p1 = rest.slice(0, 5);
    const p2 = rest.slice(5, 9);
    return `(${dd}) ${p1}-${p2}`;
  }

  // 10 dígitos -> (DD) XXXX-XXXX
  const p1 = rest.slice(0, 4);
  const p2 = rest.slice(4, 8);
  return `(${dd}) ${p1}-${p2}`;
}

/** Máscara para data DD/MM/AAAA (aceita digitar apenas números). */
export function maskDate(raw: string) {
  const d = onlyDigits(raw).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function formatMoneyFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export type ContractTime = "DIARIO" | "SEMANAL" | "MENSAL";

/** Sufixo exibido junto ao valor conforme o tempo de contrato do veículo. */
export function contractTimeSuffix(
  t: ContractTime | undefined | null
): "/diário" | "/semanal" | "/mensal" {
  if (t === "SEMANAL") return "/semanal";
  if (t === "MENSAL") return "/mensal";
  return "/diário";
}

export function formatMoneyWithContractPeriod(
  cents: number,
  contractTime: ContractTime | undefined | null
): string {
  return `${formatMoneyFromCents(cents)}${contractTimeSuffix(contractTime)}`;
}
