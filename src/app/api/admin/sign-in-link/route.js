import prisma from '@/lib/db';
import { isEmailConfigured, sendEmail } from '@/lib/email';
import { issueAdminLink } from '@/lib/adminSignInLink.mjs';

export async function POST(request) {
  const recipient = process.env.ADMIN_LOGIN_EMAIL?.trim();
  if (!recipient || !isEmailConfigured()) {
    return Response.json({ error: 'Email sign-in is unavailable. Generate a private link with npm run admin:link in the project terminal.' }, { status: 503 });
  }
  try {
    const { callbackUrl } = await request.json();
    const link = await issueAdminLink(prisma, 'email', callbackUrl);
    if (link) {
      const result = await sendEmail({
        to: recipient,
        subject: 'Sign in to Silverbyte Studio',
        text: 'Open this link within 15 minutes, then select Sign in:\n' + link.url,
        html: '<p>Your private studio sign-in link expires in 15 minutes.</p><a href="' + link.url + '">Open admin sign-in</a>',
      });
      if (!result.sent) {
        await prisma.adminSignInLink.deleteMany({ where: { digest: link.digest } });
        throw new Error('Delivery failed');
      }
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Could not send a sign-in link. Try again or generate one with npm run admin:link.' }, { status: 503 });
  }
}
