import prisma from '@/lib/db';
import { apiResponse, apiError, formatFileSize } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { buildShareEmail, sendEmail, isEmailConfigured } from '@/lib/email';
import { buildShareUrl, isValidEmail } from '@/lib/quickShare';
import { resolvePublicBaseUrl } from '@/lib/publicUrl.server';

export const dynamic = 'force-dynamic';

/**
 * Email a share link to one recipient.
 *
 * Answers 503 with `configured: false` when no mail provider is set up, so the console
 * can offer a pre-filled mailto: link instead of a dead end. Sending a link should not
 * depend on the operator having finished mail configuration.
 */
export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { id } = await params;
    const { to, note = '' } = await request.json();

    if (!isValidEmail(to)) {
      return apiError('A valid recipient email address is required', 400);
    }

    const share = await prisma.quickShare.findUnique({ where: { id } });
    if (!share) {
      return apiError('Share not found', 404);
    }
    if (!share.isActive) {
      return apiError('This share is revoked — restore it before emailing the link.', 409);
    }

    // An email is the one channel with no take-backs. A link that only resolves on
    // this network would arrive as a broken promise the operator cannot retract, so
    // stop here rather than send it.
    const link = await resolvePublicBaseUrl(request);
    if (link.scope !== 'public') {
      return Response.json(
        {
          success: false,
          linkScope: link.scope,
          baseUrl: link.baseUrl,
          error:
            link.scope === 'lan'
              ? `Links currently point at ${link.baseUrl}, which only works on this network. Set the public address of this site before emailing a link.`
              : `Links currently point at ${link.baseUrl}, which only works on this computer. Set the public address of this site before emailing a link.`,
        },
        { status: 409 }
      );
    }

    if (!isEmailConfigured()) {
      return Response.json(
        {
          success: false,
          configured: false,
          error: 'No email provider is configured. Set RESEND_API_KEY and EMAIL_FROM to send from the server.',
        },
        { status: 503 }
      );
    }

    const url = buildShareUrl(share.token, link);
    const { subject, text, html } = buildShareEmail({
      title: share.title,
      url,
      fileSizeLabel: share.fileSize ? formatFileSize(share.fileSize) : '',
      note: String(note || '').trim().slice(0, 1000),
      senderName: session.user?.name || '',
    });

    const result = await sendEmail({
      to: to.trim(),
      subject,
      text,
      html,
      // Replies should reach the person who sent the build, not the sending domain.
      replyTo: session.user?.email || undefined,
    });

    if (!result.sent) {
      return Response.json(
        { success: false, configured: result.configured, error: result.error || 'Failed to send email' },
        { status: 502 }
      );
    }

    await prisma.quickShare.update({
      where: { id },
      data: { lastEmailedTo: to.trim().slice(0, 255), lastEmailedAt: new Date() },
    });

    return apiResponse({ sent: true, to: to.trim(), id: result.id });
  } catch (error) {
    console.error('Error emailing quick share:', error);
    return apiError(error.message || 'Failed to send email', 500);
  }
}
