import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const version = await prisma.appVersion.findUnique({
      where: { id },
      include: {
        app: true,
      },
    });

    if (!version) {
      return apiError('Version not found', 404);
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

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.appVersion.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Version not found', 404);
    }

    const data = {};
    if (body.versionName !== undefined) data.versionName = body.versionName.trim();
    if (body.versionCode !== undefined) data.versionCode = parseInt(body.versionCode, 10);
    if (body.changelog !== undefined) data.changelog = body.changelog.trim();
    if (body.minOsVersion !== undefined) data.minOsVersion = body.minOsVersion.trim();
    if (body.platform !== undefined) data.platform = body.platform;
    if (body.status !== undefined) data.status = body.status;
    if (body.downloads !== undefined) data.downloads = parseInt(body.downloads, 10);
    // If a new build was uploaded, replace the file reference (and drop the old object
    // from storage so it doesn't leak); explicit nulls clear a file that was removed.
    if (body.fileName !== undefined) data.fileName = body.fileName || null;
    if (body.filePath !== undefined) data.filePath = body.filePath || null;
    if (body.fileSize !== undefined) data.fileSize = parseInt(body.fileSize, 10) || 0;

    if (
      body.filePath !== undefined &&
      existing.filePath &&
      existing.filePath !== body.filePath
    ) {
      await deleteFile(existing.filePath).catch((e) =>
        console.warn('Could not delete replaced build file:', e.message)
      );
    }

    const updated = await prisma.appVersion.update({
      where: { id },
      data,
      include: { app: true },
    });

    return apiResponse(updated);
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

    const { id } = await params;
    const existing = await prisma.appVersion.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Version not found', 404);
    }

    if (existing.filePath) {
      await deleteFile(existing.filePath);
    }

    await prisma.appVersion.delete({ where: { id } });

    return apiResponse({ message: `Version ${existing.versionName} deleted successfully` });
  } catch (error) {
    console.error('Error deleting version:', error);
    return apiError(error.message || 'Failed to delete version', 500);
  }
}

