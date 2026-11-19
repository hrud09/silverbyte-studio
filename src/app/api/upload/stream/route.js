import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { isGitHubStorageConfigured, uploadAsset } from '@/lib/githubStorage';
import { ALLOWED_FOLDERS, buildStorageName } from '@/lib/storageKeys';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Large builds on a slow connection need room; this is a single-admin upload path.
// 300 s is the most Vercel allows; with R2 configured this route is not used at all.
export const maxDuration = 300;

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
