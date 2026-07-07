import type { OwnerProfile } from "@prisma/client";

/** Campos ausentes ou inválidos no perfil do locador (somente leitura admin). */
export function ownerProfileIssues(
  profile: Pick<
    OwnerProfile,
    | "nomeRazaoSocial"
    | "emailLocador"
    | "cpfCnpj"
    | "phone"
    | "cep"
    | "logradouro"
    | "bairro"
    | "cidade"
    | "uf"
    | "numero"
  > | null
): string[] {
  if (!profile) return ["Perfil não cadastrado"];

  const issues: string[] = [];
  if (!profile.nomeRazaoSocial?.trim()) issues.push("Nome / razão social");
  if (!profile.emailLocador?.trim()) issues.push("E-mail do locador");
  if (!profile.cpfCnpj?.replace(/\D/g, "")) issues.push("CPF/CNPJ");
  if (!profile.phone?.replace(/\D/g, "")) issues.push("Telefone");
  if (!profile.cep?.replace(/\D/g, "")) issues.push("CEP");
  if (!profile.logradouro?.trim()) issues.push("Logradouro");
  if (!profile.numero?.trim()) issues.push("Número");
  if (!profile.bairro?.trim()) issues.push("Bairro");
  if (!profile.cidade?.trim()) issues.push("Cidade");
  if (!profile.uf?.trim()) issues.push("UF");

  return issues;
}
