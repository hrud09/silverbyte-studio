import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { slug, versionId } = await params;

    const version = await prisma.appVersion.findFirst({
      where: {
        id: versionId,
        app: { slug },
      },
      include: {
        app: true,
      },
    });

    if (!version) {
      return apiError(`Version "${versionId}" not found for app "${slug}"`, 404);
    }

    return apiResponse(version);
  } catch (error) {
    console.error('Error fetching version:', error);
    return apiError(error.message || 'Failed to fetch version', 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { slug, versionId } = await params;
    const body = await request.json();

    const existingVersion = await prisma.appVersion.findFirst({
      where: {
        id: versionId,
        app: { slug },
      },
    });

    if (!existingVersion) {
      return apiError(`Version "${versionId}" not found for app "${slug}"`, 404);
    }

    const updateData = {};
    if (body.versionName !== undefined) updateData.versionName = body.versionName;
    if (body.versionCode !== undefined) {
      const code = parseInt(body.versionCode, 10);
      if (isNaN(code)) return apiError('versionCode must be an integer', 400);

      const conflict = await prisma.appVersion.findFirst({
        where: {
          appId: existingVersion.appId,
          versionCode: code,
          NOT: { id: existingVersion.id },
        },
      });
      if (conflict) {
        return apiError(`Another version with versionCode ${code} already exists`, 409);
      }
      updateData.versionCode = code;
    }
    if (body.changelog !== undefined) updateData.changelog = body.changelog;
    if (body.fileName !== undefined) updateData.fileName = body.fileName;
    if (body.filePath !== undefined) updateData.filePath = body.filePath;
    if (body.fileSize !== undefined) updateData.fileSize = parseInt(body.fileSize, 10) || 0;
    if (body.minOsVersion !== undefined) updateData.minOsVersion = body.minOsVersion;
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.status !== undefined) updateData.status = body.status;

    const updatedVersion = await prisma.appVersion.update({
      where: { id: versionId },
      data: updateData,
    });

    return apiResponse(updatedVersion);
  } catch (error) {
    console.error('Error updating version:', error);
    return apiError(error.message || 'Failed to update version', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { slug, versionId } = await params;

    const existingVersion = await prisma.appVersion.findFirst({
      where: {
        id: versionId,
        app: { slug },
      },
    });

    if (!existingVersion) {
      return apiError(`Version "${versionId}" not found for app "${slug}"`, 404);
    }

    await prisma.appVersion.delete({
      where: { id: versionId },
    });

    return apiResponse({ message: `Version ${existingVersion.versionName} deleted successfully` });
  } catch (error) {
    console.error('Error deleting version:', error);
    return apiError(error.message || 'Failed to delete version', 500);
  }
}
