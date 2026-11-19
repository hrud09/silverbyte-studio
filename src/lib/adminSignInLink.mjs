import { createHash, randomBytes } from 'node:crypto';

const lifetimeMs = 15 * 60 * 1000;
const hash = (token) => createHash('sha256').update(token).digest('hex');
const adminFields = { id: true, email: true, role: true, name: true, avatar: true };

export async function issueAdminLink(db, channel, callbackPath = '/admin') {
  const admins = await db.user.findMany({ where: { role: 'ADMIN' }, select: adminFields, take: 2 });
  if (admins.length !== 1) throw new Error('Expected one studio admin account.');

  const url = new URL('/admin/login', process.env.NEXTAUTH_URL);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Configure NEXTAUTH_URL with HTTPS or a local development URL.');
  }
  if (/^\/admin(?:\/[\w-]+)*$/.test(callbackPath)) url.searchParams.set('callbackUrl', callbackPath);

  const token = randomBytes(32).toString('base64url');
  const digest = hash(token);
  const now = new Date();
  const data = { channel, digest, userId: admins[0].id, expiresAt: new Date(now.getTime() + lifetimeMs) };

  if (channel === 'email') {
    // Repeated anonymous requests must not invalidate a link already in the owner's inbox.
    await db.adminSignInLink.deleteMany({ where: { channel, expiresAt: { lte: now } } });
    const inserted = await db.adminSignInLink.createMany({ data: [data], skipDuplicates: true });
    if (!inserted.count) return null;
  } else {
    await db.adminSignInLink.upsert({ where: { channel }, create: data, update: data });
  }

  url.hash = token;
  return { url: url.href, digest };
}

export async function redeemAdminLink(db, token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const digest = hash(token);
  return db.$transaction(async (tx) => {
    const link = await tx.adminSignInLink.findUnique({ where: { digest } });
    if (!link) return null;
    const consumed = await tx.adminSignInLink.deleteMany({ where: { digest, expiresAt: { gt: new Date() } } });
    if (!consumed.count) return null;
    return tx.user.findFirst({ where: { id: link.userId, role: 'ADMIN' }, select: adminFields });
  });
}
