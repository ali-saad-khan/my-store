import { SITE_NAME } from "@/lib/seo";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Deliberately plain: inline styles only, no external CSS/images, table-free single-column
 * layout. Email clients (Outlook especially) strip most modern CSS, so simplicity here is
 * a compatibility choice, not a design shortcut.
 */
export function wrapEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 0 24px;">
                <p style="margin:0;font-size:14px;font-weight:700;color:#111111;">${SITE_NAME}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px 24px;color:#111111;font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
