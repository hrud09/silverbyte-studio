import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { getPortfolioData, savePortfolioData } from '@/lib/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPortfolioData();
    return apiResponse(data);
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return apiError(error.message || 'Failed to fetch portfolio data', 500);
  }
}

export async function PUT(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return apiError('Invalid portfolio payload', 400);
    }

    const saved = await savePortfolioData(body);
    return apiResponse(saved);
  } catch (error) {
    if (error.validationErrors) {
      return apiError(`Validation failed: ${error.validationErrors.join('; ')}`, 400);
    }
    console.error('Error saving portfolio data:', error);
    return apiError(error.message || 'Failed to save portfolio data', 500);
  }
}
