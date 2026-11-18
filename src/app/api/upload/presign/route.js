import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { isGitHubStorageConfigured } from '@/lib/githubStorage';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const body = await request.json();
    const { fileName, folder = 'uploads', contentType = 'application/octet-stream', baseName } = body;

    if (!fileName) {
      return apiError('fileName is required', 400);
    }

    // GitHub Releases: stream directly through server endpoint to avoid buffering
    if (isGitHubStorageConfigured()) {
      const streamQuery = new URLSearchParams({ fileName, folder });
      if (baseName) streamQuery.set('baseName', baseName);

      return apiResponse({
        mode: 'stream',
        directUpload: false,
        streamUrl: `/api/upload/stream?${streamQuery}`,
      });
    }

    // Fallback: local disk multipart upload
    return apiResponse({
      mode: 'server',
      directUpload: false,
      message: 'Local storage active, using standard multipart upload route',
    });
  } catch (error) {
    console.error('Presign upload error:', error);
    return apiError(error.message || 'Failed to determine upload mode', 500);
  }
}
