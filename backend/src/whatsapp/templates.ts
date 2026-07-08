import type { WhatsAppMessage, WhatsAppTemplateId } from "./types.js";

type VehicleWhatsAppData = {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  plate?: string | null;
  cor?: string | null;
};

type PersonWhatsAppData = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

const EMPTY_VALUE = "—";
const MAX_REASON_LENGTH = 400;
const MAX_PICKUP_INSTRUCTIONS_LENGTH = 400;

function valueOrDash(value: string | number | null | undefined): string {
  if (typeof value === "number") {
    return String(value);
  }
  const text = value?.trim();
  return text ? text : EMPTY_VALUE;
}

function truncate(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  if (maxLength <= 1) {
    return trimmed.slice(0, maxLength);
  }
  return `${trimmed.slice(0, maxLength - 1)}…`;
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

function vehicleBrandModel(vehicle: VehicleWhatsAppData): string {
  const parts = [vehicle.brand, vehicle.model]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" ") : EMPTY_VALUE;
}

function vehicleSummary(vehicle: VehicleWhatsAppData): string {
  const brandModel = vehicleBrandModel(vehicle);
  const plate = valueOrDash(vehicle.plate);
  return `${brandModel} (${plate})`;
}

function buildMessage(
  templateId: WhatsAppTemplateId,
  variables: string[],
  body: string
): WhatsAppMessage {
  return { templateId, variables, body };
}

export function rentalRequestedWhatsApp(input: {
  owner: Pick<PersonWhatsAppData, "name">;
  driver: PersonWhatsAppData;
  vehicle: VehicleWhatsAppData;
}): WhatsAppMessage {
  const variables = [
    valueOrDash(input.owner.name),
    vehicleSummary(input.vehicle),
    valueOrDash(input.driver.name),
    phoneOrDash(input.driver.phone),
    valueOrDash(input.driver.email),
  ];

  return buildMessage(
    "rental_requested",
    variables,
    [
      `Olá, ${variables[0]}.`,
      "Nova solicitação de locação na União Locacar.",
      `Veículo: ${variables[1]}.`,
      `Motorista: ${variables[2]}.`,
      `WhatsApp: ${variables[3]}.`,
      `E-mail: ${variables[4]}.`,
      "Abra o app uniaolocacar.com.br para analisar.",
    ].join("\n")
  );
}

export function ownerWelcomeWhatsApp(input: {
  owner: Pick<PersonWhatsAppData, "name">;
}): WhatsAppMessage {
  const variables = [valueOrDash(input.owner.name)];

  return buildMessage(
    "owner_welcome",
    variables,
    [
      `Olá, ${variables[0]}.`,
      "Bem-vindo(a) à União Locacar!",
      "Sua conta de locador foi criada.",
      "Cadastre veículos, receba solicitações e gerencie locações pelo app uniaolocacar.com.br.",
    ].join("\n")
  );
}

export function driverApprovedWhatsApp(input: {
  driver: Pick<PersonWhatsAppData, "name">;
}): WhatsAppMessage {
  const variables = [valueOrDash(input.driver.name)];

  return buildMessage(
    "driver_approved",
    variables,
    [
      `Olá, ${variables[0]}.`,
      "Seu cadastro de motorista foi aprovado na União Locacar.",
      "Acesse o app uniaolocacar.com.br para ver veículos e solicitar locações.",
    ].join("\n")
  );
}

export function driverRejectedWhatsApp(input: {
  driver: Pick<PersonWhatsAppData, "name">;
  rejectionReason: string;
}): WhatsAppMessage {
  const variables = [
    valueOrDash(input.driver.name),
    truncate(valueOrDash(input.rejectionReason), MAX_REASON_LENGTH),
  ];

  return buildMessage(
    "driver_rejected",
    variables,
    [
      `Olá, ${variables[0]}.`,
      "Seu cadastro de motorista não foi aprovado.",
      `Motivo: ${variables[1]}.`,
      "Você poderá solicitar nova análise no app uniaolocacar.com.br quando permitido.",
    ].join("\n")
  );
}

export function rentalApprovedWhatsApp(input: {
  driver: Pick<PersonWhatsAppData, "name">;
  owner: PersonWhatsAppData;
  vehicle: VehicleWhatsAppData;
  pickupInstructions: string;
}): WhatsAppMessage {
  const variables = [
    valueOrDash(input.driver.name),
    vehicleSummary(input.vehicle),
    valueOrDash(input.owner.name),
    phoneOrDash(input.owner.phone),
    truncate(
      valueOrDash(input.pickupInstructions),
      MAX_PICKUP_INSTRUCTIONS_LENGTH
    ),
  ];

  return buildMessage(
    "rental_approved",
    variables,
    [
      `Olá, ${variables[0]}.`,
      "Sua locação foi aprovada.",
      `Veículo: ${variables[1]}.`,
      `Locador: ${variables[2]}.`,
      `WhatsApp: ${variables[3]}.`,
      `Retirada: ${variables[4]}.`,
      "Detalhes no app uniaolocacar.com.br",
    ].join("\n")
  );
}

export function highlightExpiringWhatsApp(input: {
  owner: Pick<PersonWhatsAppData, "name">;
  vehicle: VehicleWhatsAppData;
  tierLabel: string;
  expiresAt: Date;
  daysLeft: number;
}): WhatsAppMessage {
  const prazo =
    input.daysLeft <= 0
      ? "hoje"
      : input.daysLeft === 1
        ? "amanhã"
        : `em ${input.daysLeft} dias`;
  const variables = [
    valueOrDash(input.owner.name),
    valueOrDash(input.tierLabel),
    vehicleSummary(input.vehicle),
    `${prazo} (${input.expiresAt.toLocaleDateString("pt-BR")})`,
  ];

  return buildMessage(
    "highlight_expiring",
    variables,
    [
      `Olá, ${variables[0]}.`,
      `O destaque ${variables[1]} do veículo ${variables[2]} expira ${variables[3]}.`,
      "Para manter a prioridade na listagem, renove pelo app uniaolocacar.com.br em Meus veículos → Destacar.",
    ].join("\n")
  );
}

export function rentalRejectedWhatsApp(input: {
  driver: Pick<PersonWhatsAppData, "name">;
  owner: PersonWhatsAppData;
  vehicle: VehicleWhatsAppData;
  rejectionReason: string;
}): WhatsAppMessage {
  const variables = [
    valueOrDash(input.driver.name),
    vehicleSummary(input.vehicle),
    valueOrDash(input.owner.name),
    phoneOrDash(input.owner.phone),
    truncate(valueOrDash(input.rejectionReason), MAX_REASON_LENGTH),
  ];

  return buildMessage(
    "rental_rejected",
    variables,
    [
      `Olá, ${variables[0]}.`,
      "Sua solicitação de locação não foi aprovada.",
      `Veículo: ${variables[1]}.`,
      `Locador: ${variables[2]}.`,
      `WhatsApp: ${variables[3]}.`,
      `Motivo: ${variables[4]}.`,
      "Dúvidas: contate o locador ou use o app uniaolocacar.com.br",
    ].join("\n")
  );
}
