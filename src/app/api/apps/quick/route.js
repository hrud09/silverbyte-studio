import prisma from '@/lib/db';
import { apiResponse, apiError, slugify } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { verifyStorageKeyExists } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Quick Upload — publish an app from just a name, icon, and APK. Everything else
 * (slug, package ID, short description, version) is auto-generated so the full
 * multi-tab AppForm isn't required for a fast first listing; the admin can always
 * fill in category, screenshots, description, etc. later via the regular editor.
 */
export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const body = await request.json();
    const {
      name,
      iconUrl,
      apkUrl,
      apkFileName,
      apkFileSize,
      developerType = 'SILVER_BYTE',
      developerName = 'Silver Byte Studios',
      developerWebsite = null,
      developerEmail = null,
      developerDetails = null,
      appType = 'NORMAL',
      modDetails = null,
    } = body;

    if (!name || !name.trim()) {
      return apiError('App name is required', 400);
    }
    if (!iconUrl) {
      return apiError('App icon is required', 400);
    }
    if (!apkUrl) {
      return apiError('APK file is required', 400);
    }

    // The client reports upload "success" based on its own view of the request; verify the
    // files actually landed in storage before this app ever goes live pointing at them.
    const [iconExists, apkExists] = await Promise.all([
      verifyStorageKeyExists(iconUrl),
      verifyStorageKeyExists(apkUrl),
    ]);
    if (!iconExists) {
      return apiError('The uploaded icon could not be found in storage. Please try uploading it again.', 422);
    }
    if (!apkExists) {
      return apiError('The uploaded APK could not be found in storage. Please try uploading it again.', 422);
    }

    const trimmedName = name.trim();
    const baseSlug = slugify(trimmedName) || 'app';
    let slug = baseSlug;
    let slugCounter = 1;
    while (await prisma.app.findUnique({ where: { slug } })) {
      slugCounter += 1;
      slug = `${baseSlug}-${slugCounter}`;
    }

    const basePackageId = `com.silverbyte.${baseSlug.replace(/-/g, '')}`;
    let packageId = basePackageId;
    let packageCounter = 1;
    while (await prisma.app.findUnique({ where: { packageId } })) {
      packageCounter += 1;
      packageId = `${basePackageId}${packageCounter}`;
    }

    const effectiveDevType = developerType === 'OTHER' ? 'OTHER' : 'SILVER_BYTE';
    const effectiveDevName = effectiveDevType === 'OTHER' ? (developerName?.trim() || 'Other Developer') : 'Silver Byte Studios';

    const newApp = await prisma.app.create({
      data: {
        name: trimmedName,
        slug,
        packageId,
        shortDescription: `${trimmedName} by ${effectiveDevName}.`,
        developerType: effectiveDevType,
        developerName: effectiveDevName,
        developerWebsite: developerWebsite || null,
        developerEmail: developerEmail || null,
        developerDetails: developerDetails || null,
        appType: appType === 'MOD' ? 'MOD' : 'NORMAL',
        modDetails: modDetails || null,
        status: 'PUBLISHED',
        assets: {
          create: [{ type: 'ICON', url: iconUrl, fileName: 'icon.png', order: 0 }],
        },
        versions: {
          create: [{
            versionName: '1.0',
            versionCode: 1,
            fileName: apkFileName || 'app.apk',
            filePath: apkUrl,
            fileSize: apkFileSize || 0,
            status: 'PUBLISHED',
          }],
        },
      },
      include: {
        category: true,
        versions: true,
        assets: true,
      },
    });

    return apiResponse(newApp, 201);
  } catch (error) {
    console.error('Error in quick app upload:', error);
    return apiError(error.message || 'Failed to create app', 500);
  }
}
