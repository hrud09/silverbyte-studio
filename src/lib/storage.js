import { writeFile, mkdir, unlink } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import {
  isGitHubStorageConfigured,
  uploadAsset,
  findAsset,
  deleteAsset,
} from '@/lib/githubStorage';
import {
  isR2StorageConfigured,
  uploadObject,
  findObject,
  deleteObject,
} from '@/lib/r2Storage';

/**
 * Strip any stored-reference wrapper (absolute URL, leading slashes, `storage/`
 * or `api/files/` prefix) down to the bare object key.
 *
 * Stored references come in several shapes depending on which upload path produced
 * them, so every lookup has to normalize before it can match a key.
 *
 * @param {string} keyOrUrl
 * @returns {string}
 */
export function normalizeStorageKey(keyOrUrl) {
  if (!keyOrUrl || typeof keyOrUrl !== 'string') return '';
  return keyOrUrl
    .replace(/^https?:\/\/[^\/]+\//, '')
    .replace(/^\/+/, '')
    .replace(/^storage[\\/]/, '')
    .replace(/^api\/files[\\/]/, '');
}

/**
 * Which backend receives new uploads. R2 wins when configured because it accepts
 * direct browser uploads, which serverless hosts need. GitHub Releases is next, and
 * stays readable even when R2 is active so files uploaded before the move keep working.
 * Local disk is the development fallback.
 *
 * @returns {'r2' | 'github' | 'local'}
 */
export function getActiveBackend() {
  if (isR2StorageConfigured()) return 'r2';
  if (isGitHubStorageConfigured()) return 'github';
  return 'local';
}

/**
 * Find a stored reference in whichever cloud backend holds it: R2 first, then
 * GitHub Releases. Returns the object's public URL and size, or null.
 *
 * @param {string} keyOrUrl
 * @returns {Promise<{ url: string, size: number, backend: 'r2' | 'github' } | null>}
 */
export async function findStoredObject(keyOrUrl) {
  if (!keyOrUrl) return null;

  if (isR2StorageConfigured()) {
    const obj = await findObject(keyOrUrl);
    if (obj) return { url: obj.url, size: obj.size, backend: 'r2' };
  }

  if (isGitHubStorageConfigured()) {
    const asset = await findAsset(normalizeStorageKey(keyOrUrl));
    if (asset) return { url: asset.url, size: asset.size, backend: 'github' };
  }

  return null;
}

/**
 * Upload a file buffer to GitHub Releases (or fallback to local disk if unconfigured)
 *
 * @param {Object} params
 * @param {Buffer} params.buffer - File content buffer
 * @param {string} params.fileName - Original file name
 * @param {string} params.folder - Destination folder/prefix (e.g. 'builds', 'icon', 'screenshot', 'feature', 'uploads')
 * @param {string} [params.contentType] - MIME type of the file
 * @returns {Promise<{ url: string, key: string, fileName: string, size: number, mimeType: string, storage: 'github' | 'local' }>}
 */
export async function uploadFile({ buffer, fileName, folder = 'uploads', contentType = 'application/octet-stream' }) {
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const key = `${folder}/${safeName}`;

  if (isR2StorageConfigured()) {
    const { url } = await uploadObject({ body: buffer, size: buffer.length, key, contentType });
    return {
      url,
      key,
      fileName,
      size: buffer.length,
      mimeType: contentType,
      storage: 'r2',
    };
  }

  if (isGitHubStorageConfigured()) {
    const { url } = await uploadAsset({
      body: buffer,
      size: buffer.length,
      key,
      contentType,
    });

    return {
      url,
      key,
      fileName,
      size: buffer.length,
      mimeType: contentType,
      storage: 'github',
    };
  }

  // --- Fallback: Local disk storage ---
  const uploadDir = path.join(process.cwd(), 'public', folder);
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, safeName);
  await writeFile(filePath, buffer);

  const localPublicUrl = `/api/files/${key}`;

  return {
    url: localPublicUrl,
    key,
    fileName,
    size: buffer.length,
    mimeType: contentType,
    storage: 'local',
  };
}

/**
 * Generate a download URL for a file
 *
 * @param {string} keyOrUrl - The storage key (e.g. 'builds/123-app.apk') or full URL
 * @returns {Promise<string|null>}
 */
export async function getDownloadUrl(keyOrUrl) {
  if (!keyOrUrl) return null;

  // R2 objects and GitHub release assets are both permanent public URLs — nothing
  // to sign, nothing to expire, and the transfer never touches this server.
  const stored = await findStoredObject(keyOrUrl);
  if (stored) return stored.url;

  return `/${normalizeStorageKey(keyOrUrl)}`;
}

/**
 * Verify that a media/build reference actually resolves to a stored object before it gets
 * persisted on an App/AppAsset record. Own-storage references (keys, /api/files/... paths,
 * or relative paths) are checked against GitHub Releases or local disk; external absolute URLs (a developer
 * pasting a link to an image hosted elsewhere) can't be verified this way, so they're trusted.
 *
 * @param {string} urlOrKey
 * @returns {Promise<boolean>}
 */
export async function verifyStorageKeyExists(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return false;

  const isDataOrBlob = urlOrKey.startsWith('data:') || urlOrKey.startsWith('blob:');
  if (isDataOrBlob) return true;

  // Our own R2 public URLs are checked like keys: a presigned upload the browser
  // abandoned halfway must not get recorded as a working file.
  if (isR2StorageConfigured() && (await findObject(urlOrKey))) return true;

  const isExternal = /^(https?:)?\/\//.test(urlOrKey);
  if (isExternal) return !isOwnR2Url(urlOrKey);

  if (isGitHubStorageConfigured() && (await findAsset(normalizeStorageKey(urlOrKey)))) {
    return true;
  }

  const key = normalizeStorageKey(urlOrKey);

  const candidatePaths = [
    path.join(process.cwd(), 'public', key),
    path.join(process.cwd(), 'storage', 'uploads', key),
    path.join(process.cwd(), 'storage', key),
  ];
  return candidatePaths.some((p) => fs.existsSync(/*turbopackIgnore: true*/ p));
}

/**
 * Delete a file from GitHub Releases or local disk storage
 *
 * @param {string} keyOrUrl
 * @returns {Promise<boolean>}
 */
export async function deleteFile(keyOrUrl) {
  if (!keyOrUrl) return false;

  if (isR2StorageConfigured() && (await deleteObject(keyOrUrl))) {
    return true;
  }

  const key = normalizeStorageKey(keyOrUrl);

  if (isGitHubStorageConfigured() && (await deleteAsset(key))) {
    return true;
  }

  // Local fallback deletion
  try {
    const candidatePaths = [
      path.join(process.cwd(), 'public', key),
      path.join(process.cwd(), 'storage/uploads', key),
      path.join(process.cwd(), 'storage', key),
    ];
    for (const localPath of candidatePaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ localPath)) {
        await unlink(localPath);
        return true;
      }
    }
  } catch (err) {
    console.error('Error deleting local file:', err);
  }

  return false;
}

/** Does this absolute URL point into our R2 bucket's public address? */
function isOwnR2Url(url) {
  const base = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '').toLowerCase();
  return Boolean(base) && url.toLowerCase().startsWith(`${base}/`);
}
