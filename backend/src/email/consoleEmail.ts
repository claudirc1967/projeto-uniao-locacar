import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

const ses = new SESv2Client({
  region: process.env.AWS_REGION ?? "sa-east-1",
});

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const from = process.env.SES_FROM_EMAIL?.trim();
  if (!from) {
    const error = new Error(
      "Amazon SES não configurado. Defina SES_FROM_EMAIL no ambiente do backend."
    );
    // eslint-disable-next-line no-console
    console.error("[EMAIL:ses:error]", error.message);
    throw error;
  }

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: {
          ToAddresses: [input.to],
        },
        Content: {
          Simple: {
            Subject: {
              Data: input.subject,
              Charset: "UTF-8",
            },
            Body: {
              Text: {
                Data: input.text,
                Charset: "UTF-8",
              },
            },
          },
        },
      })
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[EMAIL:ses:error]", {
      to: input.to,
      subject: input.subject,
      error,
    });
    throw error;
  }
}

