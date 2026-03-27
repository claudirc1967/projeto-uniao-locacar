export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Implementação de e-mail "fake" para testes:
 * apenas registra no console, sem enviar de verdade.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(
    [
      "[EMAIL:console]",
      `to=${input.to}`,
      `subject=${input.subject}`,
      "text=",
      input.text,
    ].join("\n")
  );
}

