import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import type { EmailProvider } from "./provider";
import { createConsoleProvider } from "./providers/console-provider";
import { createResendProvider } from "./providers/resend-provider";

let cachedProvider: EmailProvider | null = null;

function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  cachedProvider =
    apiKey && fromEmail ? createResendProvider(apiKey, fromEmail) : createConsoleProvider();
  return cachedProvider;
}

export type TransactionalEmailInput = {
  to: string;
  profileId?: string | null;
  templateKey: string;
  subject: string;
  html: string;
  text: string;
  payload?: Record<string, unknown>;
};

/**
 * The one place any email leaves this app. Records a `notifications` row before and
 * after the send attempt (an audit trail, per MasterPlan.txt section 27's "track failed
 * webhooks/payments/business events" — the same principle applied to email), and
 * **never throws** — a failed email must never break the order/status-change flow that
 * triggered it, since that business event already succeeded in the database by the time
 * this is called. Callers don't need a try/catch around this.
 */
export async function sendTransactionalEmail(input: TransactionalEmailInput): Promise<void> {
  const [row] = await db
    .insert(notifications)
    .values({
      profileId: input.profileId ?? null,
      channel: "email",
      templateKey: input.templateKey,
      status: "pending",
      payload: { to: input.to, subject: input.subject, ...input.payload },
    })
    .returning();

  try {
    await getEmailProvider().send({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    await db
      .update(notifications)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(notifications.id, row.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(notifications).set({ status: "failed", error: message }).where(eq(notifications.id, row.id));
    console.error(`[email] Failed to send "${input.templateKey}" to ${input.to}:`, message);
  }
}
