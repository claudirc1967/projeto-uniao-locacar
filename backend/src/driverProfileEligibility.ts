import type { DriverProfile } from "@prisma/client";

type DriverProfileFields = Pick<
  DriverProfile,
  | "status"
  | "rejectionReason"
  | "fullName"
  | "phone"
  | "cpf"
  | "cnh"
  | "cnhCategory"
  | "cnhValidity"
  | "cnhYears"
  | "cnhHasEar"
  | "criminalAttestation"
  | "uberRegistered"
  | "cep"
  | "logradouro"
  | "bairro"
  | "cidade"
  | "uf"
  | "numero"
>;

export function isDriverPreRegistrationComplete(
  profile: DriverProfileFields
): boolean {
  return !!(
    profile.fullName?.trim() &&
    profile.phone?.trim() &&
    profile.cpf?.trim() &&
    profile.cnh?.trim() &&
    profile.cnhCategory?.trim() &&
    profile.cnhValidity?.trim() &&
    profile.cnhYears != null &&
    profile.cnhYears > 0 &&
    profile.cnhHasEar === true &&
    profile.criminalAttestation === true &&
    profile.uberRegistered != null &&
    profile.cep?.trim() &&
    profile.logradouro?.trim() &&
    profile.bairro?.trim() &&
    profile.cidade?.trim() &&
    profile.uf?.trim()?.length === 2 &&
    profile.numero?.trim()
  );
}

export function getDriverRentalEligibility(
  profile: DriverProfileFields | null | undefined
): { ok: true } | { ok: false; message: string } {
  if (!profile) {
    return { ok: false, message: "Perfil de motorista não encontrado" };
  }
  if (profile.status === "REJECTED") {
    const reason = profile.rejectionReason?.trim();
    return {
      ok: false,
      message: reason
        ? `Cadastro reprovado pela plataforma: ${reason}`
        : "Cadastro reprovado pela plataforma. Entre em contato com o suporte.",
    };
  }
  if (!isDriverPreRegistrationComplete(profile)) {
    return {
      ok: false,
      message:
        "Conclua o pré-cadastro (documentos e endereço) para solicitar locação.",
    };
  }
  return { ok: true };
}
