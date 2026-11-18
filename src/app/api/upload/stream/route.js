import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { isGitHubStorageConfigured, uploadAsset } from '@/lib/githubStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Large builds on a slow connection need room; this is a single-admin upload path.
export const maxDuration = 900;

const ALLOWED_FOLDERS = new Set(['builds', 'icon', 'feature', 'screenshot', 'promo', 'uploads', 'shares']);

/**
 * Decide the stored object name.
 *
 * GitHub derives a release asset's `Content-Disposition` filename from its asset
 * name, so whatever lands here is literally what a visitor sees in their Downloads
 * folder. A timestamp prefix guarantees uniqueness but reads as machine output
 * ("1787690805975-Adultik_Talk.apk"), so callers that can describe the file — the
 * release forms know the app slug and version — pass a `baseName` instead.
 *
 * `slug-v1-0` is unique at exactly the right granularity: one name per app version.
 * Re-uploading the same version overwrites it, which is the intended behaviour when
 * an admin replaces a build. Callers without that context (or with a half-filled
 * form) send nothing and keep the timestamped fallback rather than risk two
 * different builds colliding on one name.
 *
 * @param {string} originalName - the uploaded file's own name, for its extension
 * @param {string|null} baseName - caller-supplied, untrusted
 * @returns {string}
 */
function buildStorageName(originalName, baseName) {
  const safeBase = String(baseName || '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);

  if (!safeBase) {
    return `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  }

  const ext = (originalName.match(/\.[a-zA-Z0-9]{1,10}$/) || [''])[0].toLowerCase();
  return `${safeBase}${ext}`;
}

/**
 * Stream an upload straight through to GitHub Releases.
 *
 * GitHub has no presigned-upload equivalent, so the bytes must pass through this
 * server. They are piped, never buffered: memory stays flat whether the APK is
 * 2 MB or 500 MB, which is what the FormData-based /api/upload route could not do.
 */
export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    if (!isGitHubStorageConfigured()) {
      return apiError('GitHub Releases storage is not configured', 503);
    }

    const { searchParams } = new URL(request.url);
    const rawFileName = searchParams.get('fileName');
    const folder = searchParams.get('folder') || 'uploads';

    if (!rawFileName) {
      return apiError('fileName query parameter is required', 400);
    }
    if (!ALLOWED_FOLDERS.has(folder)) {
      return apiError(`Unsupported folder "${folder}"`, 400);
    }

    // GitHub needs an exact Content-Length up front; it cannot accept a chunked body.
    const size = Number(request.headers.get('content-length'));
    if (!Number.isFinite(size) || size <= 0) {
      return apiError('A valid Content-Length header is required for streaming uploads', 411);
    }

    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const key = `${folder}/${buildStorageName(rawFileName, searchParams.get('baseName'))}`;

    if (!request.body) {
      return apiError('Request body is empty', 400);
    }

    const { url } = await uploadAsset({
      body: request.body,
      size,
      key,
      contentType,
    });

    return apiResponse({
      url,
      key,
      fileName: rawFileName,
      size,
      mimeType: contentType,
      storage: 'github',
    });
  } catch (error) {
    console.error('Streaming upload error:', error);
    return apiError(error.message || 'Failed to upload file', 500);
  }
}
