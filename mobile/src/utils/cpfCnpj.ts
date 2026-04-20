/**
 * Algoritmos espelhados em `backend/src/validation/cpfCnpj.ts` — manter em sincronia.
 */

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function allSameDigits(d: string): boolean {
  return /^(\d)\1+$/.test(d);
}

export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (allSameDigits(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]!, 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9]!, 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]!, 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]!, 10);
}

const CNPJ_W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (allSameDigits(cnpj)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]!, 10) * CNPJ_W1[i]!;
  }
  let r = sum % 11;
  const d1 = r < 2 ? 0 : 11 - r;
  if (d1 !== parseInt(cnpj[12]!, 10)) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]!, 10) * CNPJ_W2[i]!;
  }
  r = sum % 11;
  const d2 = r < 2 ? 0 : 11 - r;
  return d2 === parseInt(cnpj[13]!, 10);
}

export function cpfCnpjValidationMessage(raw: string): string | null {
  const d = digitsOnly(raw);
  if (d.length !== 11 && d.length !== 14) {
    return "CPF deve ter 11 dígitos ou CNPJ 14 dígitos";
  }
  if (d.length === 11) {
    return isValidCpf(d) ? null : "CPF inválido";
  }
  return isValidCnpj(d) ? null : "CNPJ inválido";
}

export function cpfValidationMessage(raw: string): string | null {
  const d = digitsOnly(raw);
  if (d.length !== 11) {
    return "CPF deve ter 11 dígitos";
  }
  return isValidCpf(d) ? null : "CPF inválido";
}
