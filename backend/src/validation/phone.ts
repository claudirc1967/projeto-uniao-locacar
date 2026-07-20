/** Remove tudo que não for dígito. */
export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Telefone BR com DDD:
 * - 10 dígitos: fixo (DDD + 8)
 * - 11 dígitos: celular (DDD + 9, terceiro dígito = 9)
 */
export function isValidBrazilPhoneDigits(digits: string): boolean {
  if (digits.length === 10) return true;
  if (digits.length === 11) return digits[2] === "9";
  return false;
}

export function phoneValidationMessage(
  raw: string,
  opts?: { required?: boolean; label?: string }
): string | null {
  const label = opts?.label ?? "Telefone / WhatsApp";
  const digits = normalizePhoneDigits(raw);
  if (!digits) {
    return opts?.required === false ? null : `${label} é obrigatório.`;
  }
  if (digits.length < 10) {
    return `Informe DDD + número (10 dígitos para fixo ou 11 para celular).`;
  }
  if (digits.length > 11) {
    return `${label} deve ter no máximo 11 dígitos (DDD + número).`;
  }
  if (digits.length === 11 && digits[2] !== "9") {
    return "Celular deve ter 9 dígitos após o DDD, começando com 9.";
  }
  return null;
}
