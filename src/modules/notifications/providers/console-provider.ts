import "server-only";
import type { EmailProvider, SendEmailInput } from "../provider";

/**
 * Development-only fallback used when RESEND_API_KEY isn't configured (no real Resend
 * account exists for this project — MasterPlan.txt section 35: never invent credentials,
 * never pretend an unconfigured integration is complete). Logs the email instead of
 * sending it. Never used when RESEND_API_KEY is set — see `getEmailProvider()`.
 */
export function createConsoleProvider(): EmailProvider {
  return {
    async send(input: SendEmailInput) {
      console.log(
        `[email:dev-mock] NOT actually sent (no RESEND_API_KEY configured) — to: ${input.to}, subject: ${input.subject}\n${input.text}`,
      );
    },
  };
}
