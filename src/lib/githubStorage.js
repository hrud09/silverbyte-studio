/**
 * GitHub Releases storage backend.
 *
 * Why releases rather than an object store: release assets are served from GitHub's
 * CDN with no egress metering and no bandwidth quota, allow 2 GB per file, and are
 * downloadable over a plain URL. For a low-traffic store distributing APKs, that
 * removes the two limits that actually bite — transfer cost and file size.
 *
 * Layout: one release per folder, so a storage key maps cleanly onto a release.
 *
 *   key "builds/1712-app.apk"  ->  release tag "red-apps-builds", asset "1712-app.apk"
 *   key "icon/1712-logo.png"   ->  release tag "red-apps-icon",   asset "1712-logo.png"
 *
 * Keeping the folder in the tag (instead of encoding it into the asset name) means
 * asset names stay exactly as uploaded, which matters because GitHub rewrites
 * characters it dislikes in asset filenames.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // "owner/repo"
const TAG_PREFIX = process.env.GITHUB_RELEASE_PREFIX || 'red-apps';

const API = 'https://api.github.com';
const UPLOADS = 'https://uploads.github.com';

export function isGitHubStorageConfigured() {
  return Boolean(GITHUB_TOKEN && GITHUB_REPO && GITHUB_REPO.includes('/'));
}

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'red-apps-store',
    ...extra,
  };
}

/**
 * Split a storage key into the release tag and asset name it lives under.
 * Keys without a folder land in a catch-all release rather than being rejected.
 */
export function keyToLocation(key) {
  const clean = String(key || '').replace(/^\/+/, '');

  // Uploads record their absolute browser_download_url, not the storage key, so a
  // lookup usually arrives already shaped like a release URL. Read the tag and
  // asset straight out of it: splitting on the first slash would otherwise treat
  // the repository owner as the folder and look for a release that cannot exist.
  const release = clean.match(/^(?:https?:\/\/[^/]+\/)?([^/]+\/[^/]+)\/releases\/download\/([^/]+)\/(.+)$/);
  if (release) {
    const [, repo, tag, assetName] = release;
    // Only claim it if it is ours; another repository's asset is not addressable
    // with our token and must fall through to being treated as an external URL.
    if (!GITHUB_REPO || repo.toLowerCase() === GITHUB_REPO.toLowerCase()) {
      return {
        tag,
        assetName: decodeURIComponent(assetName).replace(/\//g, '_'),
        folder: tag.startsWith(`${TAG_PREFIX}-`) ? tag.slice(TAG_PREFIX.length + 1) : tag,
      };
    }
  }

  const slash = clean.indexOf('/');
  const folder = slash === -1 ? 'uploads' : clean.slice(0, slash);
  const assetName = slash === -1 ? clean : clean.slice(slash + 1);
  return {
    tag: `${TAG_PREFIX}-${folder.replace(/[^a-zA-Z0-9._-]/g, '-')}`,
    // Nested paths would be ambiguous as an asset name; flatten them.
    assetName: assetName.replace(/\//g, '_'),
    folder,
  };
}

async function ghFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: authHeaders(options.headers) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`GitHub API ${res.status} ${res.statusText}: ${body.slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

// Release lookups are hot on the download path; the id never changes once created.
const releaseCache = new Map();

/**
 * Fetch a release by tag, or create it if absent.
 *
 * @param {string} tag
 * @param {boolean} createIfMissing
 * @returns {Promise<Object|null>}
 */
export async function getRelease(tag, createIfMissing = false) {
  if (releaseCache.has(tag)) return releaseCache.get(tag);

  try {
    const res = await ghFetch(`${API}/repos/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`);
    const release = await res.json();
    releaseCache.set(tag, release);
    return release;
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  if (!createIfMissing) return null;

  const res = await ghFetch(`${API}/repos/${GITHUB_REPO}/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: tag,
      name: tag,
      body: 'Storage container for Silver Red Store. Managed automatically — do not edit by hand.',
      draft: false,
      // Prereleases stay out of the repo's "Latest release" slot, so the storage
      // containers don't clutter the repo front page.
      prerelease: true,
    }),
  });
  const release = await res.json();
  releaseCache.set(tag, release);
  return release;
}

/**
 * Find a single asset by storage key.
 *
 * @param {string} key
 * @returns {Promise<{ id: number, name: string, size: number, url: string } | null>}
 */
export async function findAsset(key) {
  if (!isGitHubStorageConfigured()) return null;
  const { tag, assetName } = keyToLocation(key);

  try {
    const release = await getRelease(tag);
    if (!release) return null;
    const asset = (release.assets || []).find((a) => a.name === assetName);
    if (!asset) return null;
    return {
      id: asset.id,
      name: asset.name,
      size: asset.size,
      url: asset.browser_download_url,
    };
  } catch (err) {
    console.error(`[github-storage] Lookup failed for ${key}:`, err.message);
    return null;
  }
}

/**
 * Upload an asset. Accepts a Buffer or a stream; a stream keeps memory flat
 * regardless of APK size, which is the whole point of not buffering uploads.
 *
 * @param {Object} params
 * @param {Buffer|ReadableStream} params.body
 * @param {number} params.size - byte length (GitHub requires Content-Length)
 * @param {string} params.key - storage key, e.g. "builds/1712-app.apk"
 * @param {string} [params.contentType]
 * @returns {Promise<{ url: string, key: string, size: number }>}
 */
export async function uploadAsset({ body, size, key, contentType = 'application/octet-stream' }) {
  const { tag, assetName } = keyToLocation(key);
  const release = await getRelease(tag, true);

  // Asset names are unique per release. Uploaded keys carry a timestamp so this is
  // rare, but a retry after a partial failure would otherwise 422 forever.
  const existing = (release.assets || []).find((a) => a.name === assetName);
  if (existing) {
    await ghFetch(`${API}/repos/${GITHUB_REPO}/releases/assets/${existing.id}`, { method: 'DELETE' });
  }

  const uploadUrl = `${UPLOADS}/repos/${GITHUB_REPO}/releases/${release.id}/assets?name=${encodeURIComponent(assetName)}`;

  const res = await ghFetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(size),
    },
    body,
    // Required by undici to stream a request body instead of materialising it.
    duplex: 'half',
  });

  const asset = await res.json();

  // The cached release predates this asset; drop it so the next lookup sees it.
  releaseCache.delete(tag);

  return { url: asset.browser_download_url, key, size: asset.size };
}

/**
 * Delete an asset by storage key.
 *
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function deleteAsset(key) {
  if (!isGitHubStorageConfigured()) return false;
  const { tag } = keyToLocation(key);

  try {
    const asset = await findAsset(key);
    if (!asset) return false;
    await ghFetch(`${API}/repos/${GITHUB_REPO}/releases/assets/${asset.id}`, { method: 'DELETE' });
    releaseCache.delete(tag);
    return true;
  } catch (err) {
    console.error(`[github-storage] Delete failed for ${key}:`, err.message);
    return false;
  }
}

/**
 * List every asset across all storage releases, as flat storage keys.
 * Used by the storage audit.
 *
 * @returns {Promise<Array<{ key: string, size: number, lastModified: string, url: string }>>}
 */
export async function listAllAssets() {
  if (!isGitHubStorageConfigured()) return [];

  const res = await ghFetch(`${API}/repos/${GITHUB_REPO}/releases?per_page=100`);
  const releases = await res.json();

  const out = [];
  for (const release of releases) {
    if (!release.tag_name?.startsWith(`${TAG_PREFIX}-`)) continue;
    const folder = release.tag_name.slice(TAG_PREFIX.length + 1);
    for (const asset of release.assets || []) {
      out.push({
        key: `${folder}/${asset.name}`,
        size: asset.size,
        lastModified: asset.updated_at,
        url: asset.browser_download_url,
      });
    }
  }
  return out;
}

/**
 * Confirm the token, repo, and permissions actually work — surfaced in admin settings
 * so a misconfigured token fails loudly at setup instead of silently at upload time.
 */
export async function checkGitHubStorage() {
  if (!isGitHubStorageConfigured()) {
    return {
      connected: false,
      status: 'Unconfigured',
      message: 'Set GITHUB_TOKEN and GITHUB_REPO (owner/repo) to enable GitHub Releases storage.',
    };
  }

  try {
    const res = await ghFetch(`${API}/repos/${GITHUB_REPO}`);
    const repo = await res.json();

    const assets = await listAllAssets();

    return {
      connected: true,
      status: 'Connected & Operational',
      repo: repo.full_name,
      private: repo.private,
      // Private repos serve assets only through the authenticated API, so downloads
      // could not be handed straight to the browser as they can for a public repo.
      warning: repo.private
        ? 'Repository is private: release assets are not publicly downloadable, so downloads must be proxied through this server. A public repo is recommended for unmetered direct downloads.'
        : null,
      assetCount: assets.length,
      totalBytes: assets.reduce((sum, a) => sum + a.size, 0),
    };
  } catch (err) {
    return {
      connected: false,
      status: 'Connection Error',
      message: err.message,
    };
  }
}
