/**
 * Where this site is reachable from, as far as the rest of the world is concerned.
 *
 * A Quick Share link is worth nothing if the person it was sent to cannot open it, and
 * that person is almost never on this network. `request.url` answers a different
 * question — "what address did the admin type into their own browser" — which on a
 * development machine is `localhost:3000`, an address that stops meaning anything the
 * moment the link leaves the computer that produced it.
 *
 * Everything here exists to find a better answer than that, and to be honest when
 * there isn't one, so the console can say so instead of handing out a dead link.
 *
 * This half is pure: no database, no request, nothing that cannot run in a browser, so
 * the admin console can judge an address the operator types by exactly the rules the
 * server will apply to it. `publicUrl.server.js` holds the half that reads storage.
 */

/** Setting key holding the operator-configured public address of this site. */
export const PUBLIC_BASE_URL_SETTING = 'public_base_url';

/** Loopback — reachable only from the machine running the server. */
const LOOPBACK = /^(?:localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|0\.0\.0\.0|::1)$/i;

/** RFC1918 and link-local — reachable from the same Wi-Fi, and nowhere else. */
const PRIVATE_LAN =
  /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})$/;

/** Environment variables that may name this site, most deliberate first. */
const ENV_KEYS = ['PUBLIC_BASE_URL', 'NEXT_PUBLIC_BASE_URL', 'NEXTAUTH_URL', 'APP_URL'];

/**
 * How far a hostname carries.
 *
 * @param {string} hostname
 * @returns {'public'|'lan'|'local'}
 */
export function classifyHost(hostname) {
  const host = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return 'local';
  if (LOOPBACK.test(host) || host === 'host.docker.internal') return 'local';
  if (PRIVATE_LAN.test(host)) return 'lan';
  // mDNS names and bare machine names ("desktop-4f2a") resolve on the local network
  // only. The colon test keeps a global IPv6 literal out of that bucket.
  if (host.endsWith('.local') || host.endsWith('.localhost')) return 'lan';
  if (!host.includes('.') && !host.includes(':')) return 'lan';
  return 'public';
}

/**
 * Clean an address into something safe to concatenate a path onto: scheme present, no
 * query, no fragment, no trailing slash. A sub-path mount is preserved, because a site
 * served at `https://example.com/apps` really does need it.
 *
 * @param {string} value - may be scheme-less, e.g. "example.com" or "192.168.1.9:3000"
 * @returns {string|null} null when the value cannot be an http(s) address
 */
export function normalizeBaseUrl(value) {
  let raw = String(value || '').trim();
  if (!raw) return null;

  // Auto-migrate legacy site URLs to the new site domain
  raw = raw.replace(/reds-appstore\.onrender\.com/gi, 'silverredstore.onrender.com');
  raw = raw.replace(/redapps\.silverbytestudios\.com/gi, 'silverredstore.onrender.com');

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  let parsed;
  try {
    parsed = new URL(hasScheme ? raw : `http://${raw}`);
  } catch {
    return null;
  }
  if (hasScheme && parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname) return null;

  // A bare "example.com" means https; a bare "192.168.1.9:3000" does not.
  const protocol = hasScheme
    ? parsed.protocol
    : classifyHost(parsed.hostname) === 'public'
      ? 'https:'
      : 'http:';
  const port = parsed.port ? `:${parsed.port}` : '';
  const path = parsed.pathname.replace(/\/+$/, '');

  return `${protocol}//${parsed.hostname}${port}${path}`;
}

/**
 * How far a whole base URL carries.
 *
 * @param {string} value
 * @returns {'public'|'lan'|'local'}
 */
export function classifyBaseUrl(value) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return 'local';
  try {
    return classifyHost(new URL(normalized).hostname);
  } catch {
    return 'local';
  }
}

/** Header values may be comma-joined by a chain of proxies; the first hop is ours. */
function firstValue(headerValue) {
  const first = String(headerValue || '').split(',')[0].trim();
  return first || null;
}

/**
 * Read headers from either a Request or a Headers object, so route handlers and server
 * components can each hand in whatever they already have.
 */
function headerReader(source) {
  if (!source) return () => null;
  const headers = typeof source.get === 'function' ? source : source.headers;
  if (!headers || typeof headers.get !== 'function') return () => null;
  return (name) => headers.get(name);
}

/**
 * Addresses this request appears to have arrived at, best first.
 *
 * A tunnel (ngrok, cloudflared) or a platform proxy rewrites `x-forwarded-*` to the
 * address the outside world actually used — exactly the address a share link needs,
 * and one that is invisible in `request.url`.
 *
 * @param {Request|Headers} [source]
 * @returns {Array<{ url: string, source: string }>}
 */
export function baseUrlsFromRequest(source) {
  const get = headerReader(source);
  const candidates = [];
  const forwardedProto = firstValue(get('x-forwarded-proto'));

  const push = (url, name) => {
    const normalized = normalizeBaseUrl(url);
    if (normalized) candidates.push({ url: normalized, source: name });
  };

  const forwardedHost = firstValue(get('x-forwarded-host'));
  if (forwardedHost) {
    const proto = forwardedProto || (classifyBaseUrl(forwardedHost) === 'public' ? 'https' : 'http');
    push(`${proto}://${forwardedHost}`, 'forwarded-header');
  }

  const host = firstValue(get('host'));
  if (host) {
    // `x-forwarded-proto` describes the hop the forwarded host was reached on. It only
    // describes the Host header too when the proxy passed that header through
    // untouched, which is precisely the case where no forwarded host was set.
    const proto =
      (!forwardedHost && forwardedProto) || (classifyBaseUrl(host) === 'public' ? 'https' : 'http');
    push(`${proto}://${host}`, 'request-host');
  }

  if (typeof source?.url === 'string') {
    try {
      push(new URL(source.url).origin, 'request-url');
    } catch {
      // Not an absolute URL; the headers above already covered the useful cases.
    }
  }

  return candidates;
}

/** Addresses named by configuration or injected by the host platform, best first. */
export function baseUrlsFromEnv() {
  const candidates = [];

  for (const key of ENV_KEYS) {
    // NEXTAUTH_URL is conventionally written with the auth route appended; that path
    // belongs to NextAuth, not to the site.
    const raw = String(process.env[key] || '').replace(/\/api\/auth\/?$/, '');
    const url = normalizeBaseUrl(raw);
    if (url) candidates.push({ url, source: `env:${key}` });
  }

  // Injected by the host, and always the address the host is genuinely reachable at.
  const render = normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL);
  if (render) candidates.push({ url: render, source: 'env:RENDER_EXTERNAL_URL' });

  const vercel = normalizeBaseUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  );
  if (vercel) candidates.push({ url: vercel, source: 'env:VERCEL_URL' });

  return candidates;
}
