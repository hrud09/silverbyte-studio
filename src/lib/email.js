import { PLATFORM_NAME } from '@/lib/constants';

/**
 * Outbound email for Quick Share links.
 *
 * Sends over Resend's HTTP API rather than SMTP so the project stays dependency-free —
 * nodemailer would be the only reason to add a mail transport, and a single fetch does
 * the same job here.
 *
 * When no provider is configured this reports `configured: false` instead of throwing,
 * which lets the admin UI fall back to opening the operator's own mail client with the
 * message pre-filled. Sharing a link should never be blocked on mail setup.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Escape untrusted values before they are interpolated into the HTML body. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build the plain-text and HTML bodies for a share link.
 *
 * Both parts carry the URL as visible text, not just as a link target: the recipient
 * may be reading in a client that strips anchors, and a share link that cannot be
 * copied out of the message is useless.
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.url
 * @param {string} [params.fileSizeLabel]
 * @param {string} [params.note] - optional message from the sender
 * @param {string} [params.senderName]
 */
export function buildShareEmail({ title, url, fileSizeLabel = '', note = '', senderName = '' }) {
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(url);
  const from = senderName ? `${senderName} has shared` : 'You have been sent';

  const sizeLine = fileSizeLabel ? `\nSize: ${fileSizeLabel}` : '';
  const noteLine = note ? `\n\n"${note}"\n` : '';

  const text =
    `${from} an Android app with you.\n\n` +
    `${title}${sizeLine}${noteLine}\n\n` +
    `Download it here:\n${url}\n\n` +
    `Open the link on your Android device, tap Download, then open the file to install. ` +
    `You may need to allow installs from your browser in Android settings.\n\n` +
    `— ${PLATFORM_NAME}`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1A1A1A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E0E0E0;border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:24px 28px 8px;">
          <div style="font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:#D32F2F;font-weight:700;">${escapeHtml(PLATFORM_NAME)}</div>
          <p style="margin:16px 0 4px;font-size:14px;color:#666666;">${escapeHtml(from)} an app with you:</p>
          <h1 style="margin:0 0 4px;font-size:22px;line-height:1.3;">${safeTitle}</h1>
          ${fileSizeLabel ? `<p style="margin:0;font-size:13px;color:#999999;">${escapeHtml(fileSizeLabel)}</p>` : ''}
        </td>
      </tr>
      ${note ? `<tr><td style="padding:12px 28px 0;"><div style="padding:12px 16px;background:#F5F5F5;border-left:3px solid #D32F2F;border-radius:6px;font-size:14px;line-height:1.6;color:#424242;">${escapeHtml(note)}</div></td></tr>` : ''}
      <tr>
        <td style="padding:24px 28px 8px;">
          <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#D32F2F;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Download ${safeTitle}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 28px 24px;">
          <p style="margin:0 0 6px;font-size:12px;color:#999999;">Or paste this link into your browser:</p>
          <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${safeUrl}" style="color:#1565C0;">${safeUrl}</a></p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px 24px;border-top:1px solid #EEEEEE;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#999999;">
            Open this link on your Android device, tap Download, then open the file to install.
            You may need to allow installs from your browser in Android settings.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: `${title} — download link`, text, html };
}

/**
 * Send one email.
 *
 * @param {Object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} params.text
 * @param {string} [params.replyTo]
 * @returns {Promise<{ sent: boolean, configured: boolean, id?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  if (!isEmailConfigured()) {
    return { sent: false, configured: false, error: 'No email provider is configured' };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Resend puts the actionable part (unverified domain, bad key) in `message`.
      const detail = payload?.message || payload?.error?.message || `${res.status} ${res.statusText}`;
      return { sent: false, configured: true, error: detail };
    }

    return { sent: true, configured: true, id: payload?.id };
  } catch (err) {
    console.error('[email] Send failed:', err);
    return { sent: false, configured: true, error: err.message || 'Could not reach the email provider' };
  }
}
