import { randomBytes } from 'node:crypto';
import { normalizeBaseUrl, classifyBaseUrl } from '@/lib/publicUrl';

/**
 * Quick Share — the shared vocabulary between the admin console, the public /s/ page,
 * and the download route.
 *
 * A Quick Share is a build handed to a named person, not a store listing. The link is
 * the credential, so everything here is built around the token being the only thing
 * that grants access.
 */

/** Characters that survive being read aloud, retyped, and double-clicked as one word. */
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** ~114 bits of entropy — far past the point where guessing beats other attacks. */
const TOKEN_LENGTH = 20;

/**
 * Generate a share token using rejection sampling.
 *
 * `randomBytes(n) % alphabet.length` would quietly bias the first few characters
 * toward the start of the alphabet, which is exactly the property a secret must not
 * have; discarding out-of-range bytes keeps the distribution flat.
 *
 * @returns {string}
 */
export function generateShareToken() {
  const max = 256 - (256 % TOKEN_ALPHABET.length);
  let token = '';
  while (token.length < TOKEN_LENGTH) {
    for (const byte of randomBytes(TOKEN_LENGTH)) {
      if (byte >= max) continue;
      token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
      if (token.length === TOKEN_LENGTH) break;
    }
  }
  return token;
}

/**
 * Absolute, publicly reachable URL for a share.
 *
 * Always absolute: this string is pasted into chats, encoded into QR codes, and sent
 * in email, none of which can resolve a site-relative path — and none of which are
 * read on the machine that produced the link. Callers pass the address resolved by
 * `resolvePublicBaseUrl`, which is the one place that knows how far each candidate
 * address actually reaches; the environment fallbacks below only cover a caller that
 * has no request to reason from.
 *
 * @param {string|{ baseUrl: string }} [base] - resolved public address of this site
 * @param {string} token
 * @returns {string}
 */
export function buildShareUrl(token, base) {
  const root =
    normalizeBaseUrl(typeof base === 'string' ? base : base?.baseUrl) ||
    normalizeBaseUrl(process.env.PUBLIC_BASE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL) ||
    normalizeBaseUrl(process.env.NEXTAUTH_URL) ||
    'https://silverredstore.onrender.com';
  return `${root}/s/${token}`;
}

/**
 * Storage key for a shared build.
 *
 * Unlike a release, the name is random rather than descriptive. Builds live in a
 * public GitHub repository, so a key derived from the title would leak what is being
 * shared — and make neighbouring shares guessable — to anyone who found one asset.
 * The human-readable name is restored by Content-Disposition at download time.
 *
 * @param {string} token
 * @param {string} originalFileName - only its extension is used
 * @returns {string}
 */
export function buildShareStorageKey(token, originalFileName) {
  const ext = (String(originalFileName || '').match(/\.[a-zA-Z0-9]{1,10}$/) || ['.apk'])[0].toLowerCase();
  return `shares/${token}${ext}`;
}

/**
 * Give the downloaded file a name that means something on the recipient's device.
 * A title of "Red Notes Beta 4" should not arrive as "1787690805975-app_final.apk".
 *
 * @param {string} title
 * @param {string} originalFileName
 * @returns {string}
 */
export function buildDownloadFileName(title, originalFileName) {
  const ext = (String(originalFileName || '').match(/\.[a-zA-Z0-9]{1,10}$/) || ['.apk'])[0].toLowerCase();
  const stem = String(title || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return stem ? `${stem}${ext}` : String(originalFileName || 'download.apk');
}

/** Reasonable-effort email syntax check. Real validation is the message being delivered. */
export function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Calculate the expiry date from a duration string or preset.
 *
 * @param {string|number|null} expiresIn - e.g. '1h', '6h', '12h', '24h', '1d', '3d', '7d', '30d', 'never', or seconds
 * @param {string|Date|null} [customDate] - explicit ISO date or Date object
 * @returns {Date|null}
 */
export function calculateExpiresAt(expiresIn, customDate) {
  if (customDate) {
    const d = new Date(customDate);
    if (!isNaN(d.getTime())) return d;
  }

  if (!expiresIn || expiresIn === 'never' || expiresIn === 'none') {
    return null;
  }

  const now = Date.now();

  if (typeof expiresIn === 'number') {
    if (expiresIn <= 0) return null;
    return new Date(now + expiresIn * 1000);
  }

  const str = String(expiresIn).trim().toLowerCase();
  if (str === '1h') return new Date(now + 60 * 60 * 1000);
  if (str === '6h') return new Date(now + 6 * 60 * 60 * 1000);
  if (str === '12h') return new Date(now + 12 * 60 * 60 * 1000);
  if (str === '24h' || str === '1d') return new Date(now + 24 * 60 * 60 * 1000);
  if (str === '3d') return new Date(now + 3 * 24 * 60 * 60 * 1000);
  if (str === '7d' || str === '1w') return new Date(now + 7 * 24 * 60 * 60 * 1000);
  if (str === '30d' || str === '1m') return new Date(now + 30 * 24 * 60 * 60 * 1000);

  const asNum = Number(str);
  if (!isNaN(asNum) && asNum > 0) {
    return new Date(now + asNum * 1000);
  }

  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > now) {
    return parsedDate;
  }

  return null;
}

/**
 * Shape a QuickShare row for the admin console.
 * The storage path never crosses this boundary — exposing it would hand out a way
 * around the token entirely.
 *
 * `urlScope` travels with the link because a link is only half an answer: the console
 * has to be able to say "this one will not open outside your Wi-Fi" before the
 * operator sends it to someone.
 *
 * @param {Object} share
 * @param {string|{ baseUrl: string }} [base] - resolved public address of this site
 */
export function serializeShare(share, base) {
  const url = buildShareUrl(share.token, base);
  const isExpired = share.expiresAt ? new Date(share.expiresAt).getTime() <= Date.now() : false;

  return {
    url,
    urlScope: classifyBaseUrl(url),
    id: share.id,
    token: share.token,
    title: share.title,
    fileName: share.fileName,
    fileSize: share.fileSize,
    isPrivate: share.isPrivate,
    isActive: share.isActive,
    expiresAt: share.expiresAt ? (share.expiresAt instanceof Date ? share.expiresAt.toISOString() : new Date(share.expiresAt).toISOString()) : null,
    isExpired,
    downloads: share.downloads,
    lastDownloadAt: share.lastDownloadAt,
    lastEmailedTo: share.lastEmailedTo,
    lastEmailedAt: share.lastEmailedAt,
    createdAt: share.createdAt,
  };
}
