import prisma from '@/lib/db';
import { apiResponse, apiError, slugify } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { slug } = await params;

    const sourceApp = await prisma.app.findUnique({
      where: { slug },
      include: {
        versions: true,
        assets: true,
      },
    });

    if (!sourceApp) {
      return apiError(`Source app with slug "${slug}" not found`, 404);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty, defaults used below
    }

    const newName = body.name || `${sourceApp.name} (Copy)`;
    let newSlug = body.slug ? slugify(body.slug) : slugify(`${sourceApp.slug}-copy`);
    let newPackageId = body.packageId || `${sourceApp.packageId}.copy`;

    // Ensure slug uniqueness
    let counter = 1;
    while (await prisma.app.findUnique({ where: { slug: newSlug } })) {
      newSlug = `${slugify(body.slug || sourceApp.slug)}-copy-${counter}`;
      counter++;
    }

    // Ensure packageId uniqueness
    counter = 1;
    while (await prisma.app.findUnique({ where: { packageId: newPackageId } })) {
      newPackageId = `${sourceApp.packageId}.copy${counter}`;
      counter++;
    }

    const clonedApp = await prisma.app.create({
      data: {
        name: newName,
        slug: newSlug,
        packageId: newPackageId,
        shortDescription: sourceApp.shortDescription,
        fullDescription: sourceApp.fullDescription,
        developerType: sourceApp.developerType || 'SILVER_BYTE',
        developerName: sourceApp.developerName || 'Silver Byte Studios',
        developerWebsite: sourceApp.developerWebsite,
        developerEmail: sourceApp.developerEmail,
        developerDetails: sourceApp.developerDetails,
        appType: sourceApp.appType || 'NORMAL',
        modDetails: sourceApp.modDetails,
        categoryId: sourceApp.categoryId,
        tags: sourceApp.tags,
        status: 'DRAFT',
        featured: false,
        featuredOrder: 0,
        website: sourceApp.website,
        privacyPolicyUrl: sourceApp.privacyPolicyUrl,
        supportUrl: sourceApp.supportUrl,
        playStoreUrl: sourceApp.playStoreUrl,
        playStoreWebUrl: sourceApp.playStoreWebUrl,
        webAppUrl: sourceApp.webAppUrl,
        isTesting: sourceApp.isTesting,
        testingTrack: sourceApp.testingTrack,
        testingInstructions: sourceApp.testingInstructions,
        downloads: 0,
        pageViews: 0,
        versions: {
          create: sourceApp.versions.map((v) => ({
            versionName: v.versionName,
            versionCode: v.versionCode,
            changelog: v.changelog,
            fileName: v.fileName,
            filePath: v.filePath,
            fileSize: v.fileSize,
            minOsVersion: v.minOsVersion,
            platform: v.platform,
            status: 'DRAFT',
            downloads: 0,
          })),
        },
        assets: {
          // Asset URLs are timestamp-prefixed, not slug-based, so the duplicate simply
          // points at the same underlying files rather than pretending to rewrite them.
          create: sourceApp.assets.map((a) => ({
            type: a.type,
            url: a.url,
            fileName: a.fileName,
            order: a.order,
          })),
        },
      },
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

    return apiResponse(clonedApp, 201);
  } catch (error) {
    console.error('Error duplicating app:', error);
    return apiError(error.message || 'Failed to duplicate app', 500);
  }
}
