type EmailTemplate = {
  subject: string;
  text: string;
};

type VehicleEmailData = {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  plate?: string | null;
  cor?: string | null;
};

type PersonEmailData = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

const EMPTY_VALUE = "—";

function valueOrDash(value: string | number | null | undefined): string {
  if (typeof value === "number") {
    return String(value);
  }
  const text = value?.trim();
  return text ? text : EMPTY_VALUE;
}

function phoneOrDash(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return EMPTY_VALUE;

  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 10) return raw;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length === 11) {
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }

  return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}

function vehicleBrandModel(vehicle: VehicleEmailData): string {
  const parts = [vehicle.brand, vehicle.model]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" ") : EMPTY_VALUE;
}

function vehicleBrandModelWithPlate(vehicle: VehicleEmailData): string {
  return `${vehicleBrandModel(vehicle)} (${valueOrDash(vehicle.plate)})`;
}

function vehicleLines(vehicle: VehicleEmailData): string[] {
  return [
    `Veículo: ${vehicleBrandModel(vehicle)}`,
    `Ano: ${valueOrDash(vehicle.year)}`,
    `Placa: ${valueOrDash(vehicle.plate)}`,
    `Cor: ${valueOrDash(vehicle.cor)}`,
  ];
}

function signatureLines(): string[] {
  return [
    "Atenciosamente,",
    "Equipe União Locacar",
    "",
    "Este é um e-mail automático. Por favor, não responda.",
  ];
}

export function rentalRequestedEmail(input: {
  owner: PersonEmailData;
  driver: PersonEmailData;
  vehicle: VehicleEmailData;
}): EmailTemplate {
  return {
    subject: "Nova solicitação de locação",
    text: [
      `Olá, ${valueOrDash(input.owner.name)}`,
      "",
      "Você recebeu uma nova solicitação de locação.",
      "",
      ...vehicleLines(input.vehicle),
      "",
      `Motorista: ${valueOrDash(input.driver.name)}`,
      `Telefone/Whatsapp: ${phoneOrDash(input.driver.phone)}`,
      `E-mail: ${valueOrDash(input.driver.email)}`,
      "",
      ...signatureLines(),
    ].join("\n"),
  };
}

export function driverApprovedEmail(input: {
  driver: Pick<PersonEmailData, "name">;
}): EmailTemplate {
  return {
    subject: "Cadastro aprovado na União Locacar",
    text: [
      `Olá, ${valueOrDash(input.driver.name)}`,
      "",
      "Bem-vindo(a) à União Locacar!",
      "",
      "Seu cadastro de motorista foi aprovado na plataforma.",
      "A partir de agora, você já pode acessar o app, ver os veículos disponíveis e solicitar locações.",
      "",
      ...signatureLines(),
    ].join("\n"),
  };
}

export function driverRejectedEmail(input: {
  driver: Pick<PersonEmailData, "name">;
  rejectionReason: string;
}): EmailTemplate {
  return {
    subject: "Cadastro não aprovado na União Locacar",
    text: [
      `Olá, ${valueOrDash(input.driver.name)}`,
      "",
      "Informamos que infelizmente seu cadastro de motorista não foi aprovado na plataforma.",
      "",
      "Motivo:",
      valueOrDash(input.rejectionReason),
      "",
      "Você poderá fazer uma nova solicitação futuramente, assim que for feita uma nova análise do seu cadastro pela plataforma.",
      "Caso o seu cadastro seja aprovado em um nova análise, você receberá um e-mail com as instruções para acessar o app e solicitar locações.",
      "",
      ...signatureLines(),
    ].join("\n"),
  };
}

export function passwordResetEmail(input: {
  token: string;
  expiresInMinutes: number;
  resetLink?: string;
}): EmailTemplate {
  return {
    subject: "Recuperação de senha - União Locacar",
    text: [
      "Olá,",
      "",
      "Recebemos uma solicitação para redefinir a senha da sua conta na União Locacar.",
      "",
      input.resetLink
        ? `Acesse o link abaixo para criar uma nova senha:\n${input.resetLink}`
        : "Use o código abaixo na tela de nova senha do app:",
      "",
      `Código: ${input.token}`,
      "",
      `Este código expira em ${input.expiresInMinutes} minutos.`,
      "Se você não solicitou a recuperação de senha, ignore este e-mail.",
      "",
      ...signatureLines(),
    ].join("\n"),
  };
}

export function rentalApprovedEmail(input: {
  driver: Pick<PersonEmailData, "name">;
  owner: PersonEmailData;
  vehicle: VehicleEmailData;
  pickupInstructions: string;
}): EmailTemplate {
  return {
    subject: "Solicitação de locação aprovada",
    text: [
      `Olá, ${valueOrDash(input.driver.name)}`,
      "",
      "Sua solicitação de locação foi aprovada.",
      "",
      ...vehicleLines(input.vehicle),
      "",
      `Locador: ${valueOrDash(input.owner.name)}`,
      `Telefone/Whatsapp: ${phoneOrDash(input.owner.phone)}`,
      `E-mail: ${valueOrDash(input.owner.email)}`,
      "",
      "Instruções de retirada:",
      valueOrDash(input.pickupInstructions),
      "",
      ...signatureLines(),
    ].join("\n"),
  };
}

export function rentalRejectedEmail(input: {
  driver: Pick<PersonEmailData, "name">;
  owner: PersonEmailData;
  vehicle: VehicleEmailData;
  rejectionReason: string;
}): EmailTemplate {
  return {
    subject: "Solicitação de locação não aprovada",
    text: [
      `Olá, ${valueOrDash(input.driver.name)}`,
      "",
      "Sua solicitação de locação não foi aprovada.",
      "",
      ...vehicleLines(input.vehicle),
      "",
      `Locador: ${valueOrDash(input.owner.name)}`,
      `Telefone/Whatsapp: ${phoneOrDash(input.owner.phone)}`,
      `E-mail: ${valueOrDash(input.owner.email)}`,
      "",
      "Motivo:",
      valueOrDash(input.rejectionReason),
      "",
      "Você poderá fazer novas solicitações futuramente, seja para outros veículos disponíveis ou para este mesmo veículo caso o locador autorize uma nova tentativa.",
      "Se você tiver alguma dúvida ou quiser saber mais sobre o motivo da recusa, entre em contato com o locador.",
      "",
      ...signatureLines(),
    ].join("\n"),
  };
}

export function rentalReviewReminderEmail(input: {
  recipient: Pick<PersonEmailData, "name">;
  reviewedPerson: Pick<PersonEmailData, "name">;
  reviewedPersonLabel: "locador" | "locatário";
  vehicle: VehicleEmailData;
}): EmailTemplate {
  return {
    subject: "Avaliação pendente da locação",
    text: [
      `Olá, ${valueOrDash(input.recipient.name)}`,
      "",
      `A locação do veículo ${vehicleBrandModelWithPlate(input.vehicle)} foi concluída e sua avaliação ainda está pendente.`,
      "",
      "Sua opinião é importante para manter a confiança na União Locacar e ajudar outros usuários da plataforma.",
      "",
      `Acesse o app e avalie sua experiência com o ${input.reviewedPersonLabel} ${valueOrDash(input.reviewedPerson.name)} usando as estrelas e, se desejar, deixe também um comentário.`,
      "",
      ...signatureLines(),
    ].join("\n"),
  };
}
