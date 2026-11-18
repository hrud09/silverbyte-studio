import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const [
      totalApps,
      publishedApps,
      draftApps,
      archivedApps,
      totalVersions,
      totalCategories,
      downloadsAgg,
      pageViewsAgg,
      versionsSizeAgg,
      recentActivity,
    ] = await Promise.all([
      prisma.app.count(),
      prisma.app.count({ where: { status: 'PUBLISHED' } }),
      prisma.app.count({ where: { status: 'DRAFT' } }),
      prisma.app.count({ where: { status: 'ARCHIVED' } }),
      prisma.appVersion.count(),
      prisma.category.count(),
      prisma.app.aggregate({ _sum: { downloads: true } }),
      prisma.app.aggregate({ _sum: { pageViews: true } }),
      prisma.appVersion.aggregate({ _sum: { fileSize: true } }),
      // Recent event activity
      prisma.analyticsEvent.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          app: { select: { name: true, slug: true } },
          appVersion: { select: { versionName: true } },
        },
      }),
    ]);

    return apiResponse({
      apps: {
        total: totalApps,
        published: publishedApps,
        draft: draftApps,
        archived: archivedApps,
      },
      versions: {
        total: totalVersions,
        totalStorageBytes: versionsSizeAgg._sum.fileSize || 0,
      },
      categories: {
        total: totalCategories,
      },
      metrics: {
        totalDownloads: downloadsAgg._sum.downloads || 0,
        totalPageViews: pageViewsAgg._sum.pageViews || 0,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return apiError(error.message || 'Failed to fetch admin stats', 500);
  }
}
