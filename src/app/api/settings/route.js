import { PORTFOLIO_SETTING_KEY } from '@/lib/constants';
import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settingsList = await prisma.setting.findMany({ where: { key: { not: PORTFOLIO_SETTING_KEY } } });

    // Map into key-value object
    const settings = {};
    for (const item of settingsList) {
      settings[item.key] = item.value;
    }

    return apiResponse(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return apiError(error.message || 'Failed to fetch settings', 500);
  }
}

export async function PUT(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const body = await request.json();

    if (typeof body !== 'object' || body === null) {
      return apiError('Invalid request body: expected an object of key-value settings', 400);
    }

    const updates = [];
    for (const [key, value] of Object.entries(body)) {
      if (key === PORTFOLIO_SETTING_KEY) continue;
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      updates.push(
        prisma.setting.upsert({
          where: { key },
          update: { value: stringValue },
          create: { key, value: stringValue },
        })
      );
    }

    await Promise.all(updates);

    // Return updated settings map
    const allSettings = await prisma.setting.findMany({ where: { key: { not: PORTFOLIO_SETTING_KEY } } });
    const result = {};
    for (const s of allSettings) {
      result[s.key] = s.value;
    }

    return apiResponse(result);
  } catch (error) {
    console.error('Error updating settings:', error);
    return apiError(error.message || 'Failed to update settings', 500);
  }
}
