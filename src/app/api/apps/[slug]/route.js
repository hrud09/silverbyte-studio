import prisma from '@/lib/db';
import { apiResponse, apiError, slugify } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { verifyStorageKeyExists } from '@/lib/storage';

/**
 * Drop any asset whose reference doesn't actually resolve to a stored object, instead of
 * silently persisting a URL that will 404 forever. Uploads can fail invisibly on the client
 * side (network blip, CORS, retried flow minting a new key) and still report "success" —
 * this is the last line of defense before a broken reference reaches the database.
 */
async function verifyAssets(assets) {
  const valid = [];
  const dropped = [];
  for (const asset of assets) {
    if (asset?.url && (await verifyStorageKeyExists(asset.url))) {
      valid.push(asset);
    } else if (asset?.url) {
      dropped.push({ type: asset.type, url: asset.url });
    }
  }
  return { valid, dropped };
}

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    const app = await prisma.app.findUnique({
      where: { slug },
      include: {
        category: true,
        versions: {
          orderBy: { versionCode: 'desc' },
        },
        assets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!app) {
      return apiError(`App with slug "${slug}" not found`, 404);
    }

    // Increment pageViews and log AnalyticsEvent asynchronously
    await Promise.all([
      prisma.app.update({
        where: { id: app.id },
        data: { pageViews: { increment: 1 } },
      }),
      prisma.analyticsEvent.create({
        data: {
          type: 'PAGE_VIEW',
          appId: app.id,
          metadata: JSON.stringify({
            userAgent: request.headers.get('user-agent') || 'unknown',
            referer: request.headers.get('referer') || '',
          }),
        },
      }),
    ]);

    const latestVersion = app.versions.find((v) => v.status === 'PUBLISHED') || app.versions[0] || null;

    return apiResponse({
      ...app,
      pageViews: app.pageViews + 1,
      latestVersion,
    });
  } catch (error) {
    console.error('Error fetching app by slug:', error);
    return apiError(error.message || 'Failed to fetch app', 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { slug } = await params;
    const body = await request.json();

    const existingApp = await prisma.app.findUnique({ where: { slug } });
    if (!existingApp) {
      return apiError(`App with slug "${slug}" not found`, 404);
    }

    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined && body.slug !== slug) {
      const newSlug = slugify(body.slug);
      const conflict = await prisma.app.findUnique({ where: { slug: newSlug } });
      if (conflict && conflict.id !== existingApp.id) {
        return apiError(`Slug "${newSlug}" is already taken`, 409);
      }
      updateData.slug = newSlug;
    }
    if (body.packageId !== undefined && body.packageId !== existingApp.packageId) {
      const conflict = await prisma.app.findUnique({ where: { packageId: body.packageId } });
      if (conflict && conflict.id !== existingApp.id) {
        return apiError(`Package ID "${body.packageId}" is already taken`, 409);
      }
      updateData.packageId = body.packageId;
    }
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
    if (body.fullDescription !== undefined) updateData.fullDescription = body.fullDescription;
    if (body.developerType !== undefined) {
      updateData.developerType = body.developerType === 'OTHER' ? 'OTHER' : 'SILVER_BYTE';
    }
    if (body.developerName !== undefined) {
      if (updateData.developerType === 'SILVER_BYTE' || (updateData.developerType === undefined && existingApp.developerType === 'SILVER_BYTE' && body.developerType !== 'OTHER')) {
        updateData.developerName = 'Silver Byte Studios';
      } else {
        updateData.developerName = body.developerName || 'Other Developer';
      }
    }
    if (body.developerWebsite !== undefined) updateData.developerWebsite = body.developerWebsite || null;
    if (body.developerEmail !== undefined) updateData.developerEmail = body.developerEmail || null;
    if (body.developerDetails !== undefined) updateData.developerDetails = body.developerDetails || null;
    if (body.appType !== undefined) updateData.appType = body.appType === 'MOD' ? 'MOD' : 'NORMAL';
    if (body.modDetails !== undefined) updateData.modDetails = body.modDetails || null;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
    if (body.tags !== undefined) updateData.tags = Array.isArray(body.tags) ? body.tags.join(',') : body.tags;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.featured !== undefined) updateData.featured = Boolean(body.featured);
    if (body.featuredOrder !== undefined) updateData.featuredOrder = parseInt(body.featuredOrder, 10) || 0;
    if (body.website !== undefined) updateData.website = body.website || null;
    if (body.privacyPolicyUrl !== undefined) updateData.privacyPolicyUrl = body.privacyPolicyUrl || null;
    if (body.supportUrl !== undefined) updateData.supportUrl = body.supportUrl || null;
    if (body.playStoreUrl !== undefined) updateData.playStoreUrl = body.playStoreUrl || null;
    if (body.playStoreWebUrl !== undefined) updateData.playStoreWebUrl = body.playStoreWebUrl || null;
    if (body.webAppUrl !== undefined) updateData.webAppUrl = body.webAppUrl || null;
    if (body.isTesting !== undefined) updateData.isTesting = Boolean(body.isTesting);
    if (body.testingTrack !== undefined) updateData.testingTrack = body.testingTrack || '';
    if (body.testingInstructions !== undefined) updateData.testingInstructions = body.testingInstructions || '';

    // Handle updating or synchronizing assets if provided
    let droppedAssets = [];
    if (Array.isArray(body.assets)) {
      const { valid, dropped } = await verifyAssets(body.assets);
      droppedAssets = dropped;

      // Re-create or update assets
      await prisma.appAsset.deleteMany({ where: { appId: existingApp.id } });
      if (valid.length > 0) {
        await prisma.appAsset.createMany({
          data: valid.map((asset, index) => ({
            appId: existingApp.id,
            type: asset.type || 'SCREENSHOT',
            url: asset.url,
            fileName: asset.fileName || '',
            order: asset.order !== undefined ? asset.order : index,
          })),
        });
      }
    }

    const updatedApp = await prisma.app.update({
      where: { id: existingApp.id },
      data: updateData,
      include: {
        category: true,
        versions: {
          orderBy: { versionCode: 'desc' },
        },
        assets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return apiResponse({
      ...updatedApp,
      ...(droppedAssets.length > 0 ? {
        warning: `${droppedAssets.length} asset(s) could not be verified in storage and were not saved: ${droppedAssets.map((a) => a.type).join(', ')}`,
      } : {}),
    });
  } catch (error) {
    console.error('Error updating app:', error);
    return apiError(error.message || 'Failed to update app', 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { slug } = await params;

    const existingApp = await prisma.app.findUnique({ where: { slug } });
    if (!existingApp) {
      return apiError(`App with slug "${slug}" not found`, 404);
    }

    await prisma.app.delete({
      where: { id: existingApp.id },
    });

    return apiResponse({ message: `App "${existingApp.name}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting app:', error);
    return apiError(error.message || 'Failed to delete app', 500);
  }
}
