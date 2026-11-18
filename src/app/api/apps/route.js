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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search');
    const featuredParam = searchParams.get('featured');
    const platform = searchParams.get('platform');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const skip = (page - 1) * limit;

    const session = await requireAuth();
    const isAdmin = Boolean(session?.user);

    // Build filter conditions
    const where = {};

    // Status filtering: default to PUBLISHED unless admin explicitly requests another or all
    if (statusParam) {
      if (statusParam !== 'ALL') {
        where.status = statusParam;
      }
    } else if (!isAdmin) {
      where.status = 'PUBLISHED';
    }

    // Category filter
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    // Featured filter
    if (featuredParam !== null && featuredParam !== undefined && featuredParam !== '') {
      where.featured = featuredParam === 'true' || featuredParam === '1';
    }

    // Developer source filter (SILVER_BYTE vs OTHER)
    const developerTypeParam = searchParams.get('developerType');
    if (developerTypeParam && developerTypeParam !== 'ALL') {
      where.developerType = developerTypeParam;
    }

    // App classification filter (NORMAL vs MOD)
    const appTypeParam = searchParams.get('appType');
    if (appTypeParam && appTypeParam !== 'ALL') {
      where.appType = appTypeParam;
    }

    // Testing filter
    const isTestingParam = searchParams.get('isTesting');
    if (isTestingParam !== null && isTestingParam !== undefined && isTestingParam !== '') {
      where.isTesting = isTestingParam === 'true' || isTestingParam === '1';
    }

    // Search query
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { shortDescription: { contains: q, mode: 'insensitive' } },
        { fullDescription: { contains: q, mode: 'insensitive' } },
        { tags: { contains: q, mode: 'insensitive' } },
        { packageId: { contains: q, mode: 'insensitive' } },
        { developerName: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Platform filter via versions relation
    if (platform) {
      where.versions = {
        some: {
          platform: { equals: platform },
        },
      };
    }

    const [total, apps] = await Promise.all([
      prisma.app.count({ where }),
      prisma.app.findMany({
        where,
        include: {
          category: true,
          versions: {
            orderBy: { versionCode: 'desc' },
          },
          assets: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: [
          { featured: 'desc' },
          { featuredOrder: 'asc' },
          { downloads: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
    ]);

    // Format response apps: attach latestVersion convenience field
    const formattedApps = apps.map((app) => {
      const latestVersion = app.versions.find((v) => v.status === 'PUBLISHED') || app.versions[0] || null;
      return {
        ...app,
        latestVersion,
      };
    });

    return apiResponse({
      apps: formattedApps,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching apps:', error);
    return apiError(error.message || 'Failed to fetch apps', 500);
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
      name,
      slug: customSlug,
      packageId,
      shortDescription,
      fullDescription = '',
      developerType = 'SILVER_BYTE',
      developerName = 'Silver Byte Studios',
      developerWebsite = '',
      developerEmail = '',
      developerDetails = '',
      appType = 'NORMAL',
      modDetails = '',
      categoryId,
      tags = '',
      status = 'DRAFT',
      featured = false,
      featuredOrder = 0,
      website = '',
      privacyPolicyUrl = '',
      supportUrl = '',
      playStoreUrl = '',
      playStoreWebUrl = '',
      webAppUrl = '',
      isTesting = false,
      testingTrack = '',
      testingInstructions = '',
    } = body;

    if (!name || !packageId || !shortDescription) {
      return apiError('name, packageId, and shortDescription are required', 400);
    }

    const slug = customSlug ? slugify(customSlug) : slugify(name);

    // Check slug uniqueness
    const existingSlug = await prisma.app.findUnique({ where: { slug } });
    if (existingSlug) {
      return apiError(`An app with slug "${slug}" already exists`, 409);
    }

    // Check packageId uniqueness
    const existingPackage = await prisma.app.findUnique({ where: { packageId } });
    if (existingPackage) {
      return apiError(`An app with packageId "${packageId}" already exists`, 409);
    }

    // Validate category if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return apiError('Category not found', 404);
      }
    }

    let validAssets = [];
    let droppedAssets = [];
    if (Array.isArray(body.assets) && body.assets.length > 0) {
      const result = await verifyAssets(body.assets);
      validAssets = result.valid;
      droppedAssets = result.dropped;
    }

    const newApp = await prisma.app.create({
      data: {
        name,
        slug,
        packageId,
        shortDescription,
        fullDescription,
        developerType: developerType === 'OTHER' ? 'OTHER' : 'SILVER_BYTE',
        developerName: developerType === 'OTHER' ? (developerName || 'Other Developer') : 'Silver Byte Studios',
        developerWebsite: developerWebsite || null,
        developerEmail: developerEmail || null,
        developerDetails: developerDetails || null,
        appType: appType === 'MOD' ? 'MOD' : 'NORMAL',
        modDetails: modDetails || null,
        categoryId: categoryId || null,
        tags: Array.isArray(tags) ? tags.join(',') : tags,
        status,
        featured: Boolean(featured),
        featuredOrder: parseInt(featuredOrder, 10) || 0,
        website: website || null,
        privacyPolicyUrl: privacyPolicyUrl || null,
        supportUrl: supportUrl || null,
        playStoreUrl: playStoreUrl || null,
        playStoreWebUrl: playStoreWebUrl || null,
        webAppUrl: webAppUrl || null,
        isTesting: Boolean(isTesting || playStoreUrl || playStoreWebUrl),
        testingTrack: testingTrack || '',
        testingInstructions: testingInstructions || '',
        assets: validAssets.length > 0 ? {
          create: validAssets.map((asset, index) => ({
            type: asset.type || 'SCREENSHOT',
            url: asset.url,
            fileName: asset.fileName || '',
            order: asset.order !== undefined ? asset.order : index,
          })),
        } : undefined,
      },
      include: {
        category: true,
        versions: true,
        assets: true,
      },
    });

    return apiResponse({
      ...newApp,
      ...(droppedAssets.length > 0 ? {
        warning: `${droppedAssets.length} asset(s) could not be verified in storage and were not saved: ${droppedAssets.map((a) => a.type).join(', ')}`,
      } : {}),
    }, 201);
  } catch (error) {
    console.error('Error creating app:', error);
    return apiError(error.message || 'Failed to create app', 500);
  }
}
