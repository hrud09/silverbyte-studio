import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { checkGitHubStorage } from '@/lib/githubStorage';
import { getActiveBackend } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const result = await checkGitHubStorage();

    return apiResponse({
      ...result,
      activeBackend: getActiveBackend(),
    });
  } catch (error) {
    console.error('GitHub storage status error:', error);
    return apiResponse({ connected: false, status: 'Connection Error', message: error.message }, 200);
  }
}
