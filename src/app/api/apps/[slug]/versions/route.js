import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    const app = await prisma.app.findUnique({
      where: { slug },
      include: {
        versions: {
          orderBy: { versionCode: 'desc' },
        },
      },
    });

    if (!app) {
      return apiError(`App with slug "${slug}" not found`, 404);
    }

    return apiResponse(app.versions);
  } catch (error) {
    console.error('Error fetching app versions:', error);
    return apiError(error.message || 'Failed to fetch versions', 500);
  }
}

export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { slug } = await params;
    const body = await request.json();

    const app = await prisma.app.findUnique({ where: { slug } });
    if (!app) {
      return apiError(`App with slug "${slug}" not found`, 404);
    }

    const {
      versionName,
      versionCode,
      changelog = '',
      fileName = null,
      filePath = null,
      fileSize = 0,
      minOsVersion = 'Android 8.0',
      platform = 'Android',
      status = 'PUBLISHED',
    } = body;

    if (!versionName || versionCode === undefined || versionCode === null) {
      return apiError('versionName and versionCode are required', 400);
    }

    const numericVersionCode = parseInt(versionCode, 10);
    if (isNaN(numericVersionCode)) {
      return apiError('versionCode must be a valid integer', 400);
    }

    // Check for duplicate versionCode for the same app
    const existingVersion = await prisma.appVersion.findFirst({
      where: {
        appId: app.id,
        versionCode: numericVersionCode,
      },
    });

    if (existingVersion) {
      return apiError(`A version with versionCode ${numericVersionCode} already exists for this app`, 409);
    }

    const newVersion = await prisma.appVersion.create({
      data: {
        appId: app.id,
        versionName,
        versionCode: numericVersionCode,
        changelog,
        fileName,
        filePath,
        fileSize: parseInt(fileSize, 10) || 0,
        minOsVersion,
        platform,
        status,
        downloads: 0,
      },
    });

    // Update app's updatedAt timestamp
    await prisma.app.update({
      where: { id: app.id },
      data: { updatedAt: new Date() },
    });

    return apiResponse(newVersion, 201);
  } catch (error) {
    console.error('Error creating app version:', error);
    return apiError(error.message || 'Failed to create version', 500);
  }
}
