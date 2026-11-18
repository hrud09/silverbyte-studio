import { writeFile, mkdir, unlink } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import {
  isGitHubStorageConfigured,
  uploadAsset,
  findAsset,
  deleteAsset,
} from '@/lib/githubStorage';

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
 * Which backend is actually serving files. GitHub Releases wins when configured
 * because it provides unmetered egress with permanent CDN URLs. Local disk is
 * the development fallback.
 *
 * @returns {'github' | 'local'}
 */
export function getActiveBackend() {
  if (isGitHubStorageConfigured()) return 'github';
  return 'local';
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

  if (isGitHubStorageConfigured()) {
    // Release assets are permanent public URLs on GitHub's CDN — nothing to sign,
    // nothing to expire, and the transfer never touches this server.
    const asset = await findAsset(normalizeStorageKey(keyOrUrl));
    if (asset) return asset.url;
  }

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

  const isExternal = /^(https?:)?\/\//.test(urlOrKey);
  const isDataOrBlob = urlOrKey.startsWith('data:') || urlOrKey.startsWith('blob:');
  if (isExternal || isDataOrBlob) return true;

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
