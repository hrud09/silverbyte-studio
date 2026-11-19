import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { checkGitHubStorage } from '@/lib/githubStorage';
import { isR2StorageConfigured, checkR2Storage } from '@/lib/r2Storage';
import { getActiveBackend } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    // Report on whichever backend receives uploads. When R2 is active, GitHub is
    // only consulted for files uploaded before the move, so it is not what to test.
    const result = isR2StorageConfigured() ? await checkR2Storage() : await checkGitHubStorage();

    return apiResponse({
      ...result,
      activeBackend: getActiveBackend(),
    });
  } catch (error) {
    console.error('GitHub storage status error:', error);
    return apiResponse({ connected: false, status: 'Connection Error', message: error.message }, 200);
  }
}
