import "server-only";
import { Resend } from "resend";
import type { EmailProvider, SendEmailInput } from "../provider";

/** The real production provider — requires RESEND_API_KEY and a verified RESEND_FROM_EMAIL. */
export function createResendProvider(apiKey: string, fromEmail: string): EmailProvider {
  const client = new Resend(apiKey);

  return {
    async send(input: SendEmailInput) {
      const result = await client.emails.send({
        from: fromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      if (result.error) {
        throw new Error(`Resend error: ${result.error.message}`);
      }
    },
  };
}
