import prisma from '@/lib/db';
import {
  PUBLIC_BASE_URL_SETTING,
  baseUrlsFromEnv,
  baseUrlsFromRequest,
  classifyBaseUrl,
  normalizeBaseUrl,
} from '@/lib/publicUrl';

/**
 * Resolving the public address of this site, for callers that have a database.
 *
 * Separate from `publicUrl.js` only because of the Prisma import: the bundler follows
 * a lazy `import()` as eagerly as a static one, so a single module would drag `pg` into
 * every client component that wanted to validate a URL.
 */

/** A public address always beats a LAN one, which always beats loopback. */
const SCOPE_RANK = { public: 0, lan: 1, local: 2 };

/**
 * The address the operator set in the admin console, if any.
 *
 * A database failure returns null rather than taking the page down: not knowing the
 * configured address is a worse link, not a broken request.
 *
 * @returns {Promise<string|null>}
 */
export async function readPublicBaseUrlSetting() {
  try {
    const row = await prisma.setting.findUnique({ where: { key: PUBLIC_BASE_URL_SETTING } });
    if (!row?.value) return null;
    const normalized = normalizeBaseUrl(row.value);
    if (row.value && (row.value.includes('reds-appstore.onrender.com') || row.value.includes('redapps.silverbytestudios.com'))) {
      await prisma.setting.update({
        where: { key: PUBLIC_BASE_URL_SETTING },
        data: { value: normalized },
      }).catch(() => {});
    }
    return normalized;
  } catch (err) {
    console.warn('[public-url] Could not read the configured public address:', err.message);
    return null;
  }
}

/**
 * Decide the address to build outbound links from.
 *
 * Candidates are gathered from everything that could know, then ranked: reach first —
 * a public address always beats a LAN one, which always beats loopback — and within
 * equal reach the more deliberate source wins, because an operator who typed an
 * address into the console meant it and should not be overruled by a Host header.
 *
 * @param {Request|Headers} [source] - the current request, when there is one
 * @returns {Promise<{ baseUrl: string, scope: 'public'|'lan'|'local', source: string, configured: string|null }>}
 */
export async function resolvePublicBaseUrl(source) {
  const configured = await readPublicBaseUrlSetting();

  const candidates = [
    ...(configured ? [{ url: configured, source: 'setting' }] : []),
    ...baseUrlsFromEnv(),
    ...baseUrlsFromRequest(source),
  ];

  const best = candidates
    .map((candidate, index) => ({ ...candidate, index, scope: classifyBaseUrl(candidate.url) }))
    .sort((a, b) => SCOPE_RANK[a.scope] - SCOPE_RANK[b.scope] || a.index - b.index)[0];

  if (!best) {
    const fallbackUrl = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://silverredstore.onrender.com';
    return { baseUrl: fallbackUrl, scope: classifyBaseUrl(fallbackUrl), source: 'fallback', configured };
  }

  return { baseUrl: best.url, scope: best.scope, source: best.source, configured };
}
