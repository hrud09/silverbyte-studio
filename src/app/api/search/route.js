import prisma from '@/lib/db';
import { apiResponse, apiError, getAppIconUrl } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || searchParams.get('query') || '').trim();

    if (!query) {
      return apiResponse({ apps: [], categories: [], total: 0 });
    }

    const session = await requireAuth();
    const isAdmin = Boolean(session?.user);

    // Filter condition for apps
    const appWhere = {
      ...(isAdmin ? {} : { status: 'PUBLISHED' }),
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } },
        { fullDescription: { contains: query, mode: 'insensitive' } },
        { tags: { contains: query, mode: 'insensitive' } },
        { packageId: { contains: query, mode: 'insensitive' } },
      ],
    };

    // Filter condition for categories
    const categoryWhere = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [apps, categories] = await Promise.all([
      prisma.app.findMany({
        where: appWhere,
        include: {
          category: true,
          versions: {
            where: isAdmin ? {} : { status: 'PUBLISHED' },
            orderBy: { versionCode: 'desc' },
            take: 1,
          },
          assets: {
            where: { type: 'ICON' },
            take: 1,
          },
        },
        take: 20,
      }),
      prisma.category.findMany({
        where: categoryWhere,
        include: {
          _count: {
            select: {
              apps: {
                where: { status: 'PUBLISHED' },
              },
            },
          },
        },
        take: 10,
      }),
    ]);

    // Format apps
    const formattedApps = apps.map((app) => ({
      ...app,
      latestVersion: app.versions[0] || null,
      iconUrl: getAppIconUrl(app),
    }));

    // Format categories
    const formattedCategories = categories.map((cat) => ({
      ...cat,
      appCount: cat._count.apps,
    }));

    // Also record SEARCH event in Analytics asynchronously
    prisma.analyticsEvent
      .create({
        data: {
          type: 'SEARCH',
          metadata: JSON.stringify({
            query,
            resultCount: apps.length + categories.length,
            userAgent: request.headers.get('user-agent') || 'unknown',
          }),
        },
      })
      .catch((e) => console.error('Failed to log search event:', e));

    return apiResponse({
      query,
      apps: formattedApps,
      categories: formattedCategories,
      total: formattedApps.length + formattedCategories.length,
    });
  } catch (error) {
    console.error('Error in search endpoint:', error);
    return apiError(error.message || 'Search failed', 500);
  }
}
