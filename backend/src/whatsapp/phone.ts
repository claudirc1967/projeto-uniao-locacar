const BRAZIL_COUNTRY_CODE = "55";
const BRAZIL_LOCAL_DIGITS_MIN = 10;
const BRAZIL_LOCAL_DIGITS_MAX = 11;

export function normalizePhoneToE164(
  value: string | null | undefined
): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return null;

  if (digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    const national = digits.slice(BRAZIL_COUNTRY_CODE.length);
    if (
      national.length >= BRAZIL_LOCAL_DIGITS_MIN &&
      national.length <= BRAZIL_LOCAL_DIGITS_MAX
    ) {
      return `+${BRAZIL_COUNTRY_CODE}${national}`;
    }
    return null;
  }

  if (
    digits.length >= BRAZIL_LOCAL_DIGITS_MIN &&
    digits.length <= BRAZIL_LOCAL_DIGITS_MAX
  ) {
    return `+${BRAZIL_COUNTRY_CODE}${digits}`;
  }

  return null;
}

export function maskPhoneForLog(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `+${digits.slice(0, 2)}******${digits.slice(-2)}`;
}
