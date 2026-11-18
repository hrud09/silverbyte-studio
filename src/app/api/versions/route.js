import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId');
    const appSlug = searchParams.get('appSlug');
    const status = searchParams.get('status');

    const where = {};
    if (appId) where.appId = appId;
    if (appSlug) where.app = { slug: appSlug };
    if (status && status !== 'ALL') where.status = status;

    const versions = await prisma.appVersion.findMany({
      where,
      include: {
        app: {
          select: {
            id: true,
            slug: true,
            name: true,
            packageId: true,
            assets: {
              where: { type: 'ICON' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return apiError(error.message || 'Failed to fetch versions', 500);
  }
}

export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const body = await request.json();
    const {
      appId,
      versionName,
      versionCode,
      changelog = '',
      fileName = '',
      filePath = '',
      fileSize = 0,
      minOsVersion = 'Android 8.0',
      platform = 'Android',
      status = 'PUBLISHED',
    } = body;

    if (!appId || !versionName || versionCode === undefined) {
      return apiError('appId, versionName, and versionCode are required', 400);
    }

    const app = await prisma.app.findUnique({ where: { id: appId } });
    if (!app) {
      return apiError('App not found', 404);
    }

    const parsedVersionCode = parseInt(versionCode, 10);
    const parsedFileSize = parseInt(fileSize, 10) || 0;

    // Check version code collision for this app
    const existingCode = await prisma.appVersion.findFirst({
      where: {
        appId,
        versionCode: parsedVersionCode,
      },
    });

    if (existingCode) {
      return apiError(`Version code ${parsedVersionCode} already exists for this app`, 409);
    }

    const newVersion = await prisma.appVersion.create({
      data: {
        appId,
        versionName: versionName.trim(),
        versionCode: parsedVersionCode,
        changelog: changelog.trim(),
        // Only store what was actually uploaded — never fabricate a plausible-looking
        // file name/path for a build that doesn't exist.
        fileName: fileName || null,
        filePath: filePath || null,
        fileSize: parsedFileSize,
        minOsVersion: minOsVersion.trim(),
        platform,
        status,
      },
      include: {
        app: true,
      },
    });

    return apiResponse(newVersion, 201);
  } catch (error) {
    console.error('Error creating release:', error);
    return apiError(error.message || 'Failed to create release', 500);
  }
}
