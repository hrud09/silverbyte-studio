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
      totalReleases,
      publishedReleases,
      apps,
      versions,
      recentReleases,
      recentEvents,
      categories,
    ] = await Promise.all([
      prisma.app.count(),
      prisma.app.count({ where: { status: 'PUBLISHED' } }),
      prisma.app.count({ where: { status: 'DRAFT' } }),
      prisma.app.count({ where: { status: 'ARCHIVED' } }),
      prisma.appVersion.count(),
      prisma.appVersion.count({ where: { status: 'PUBLISHED' } }),
      prisma.app.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          downloads: true,
          pageViews: true,
          status: true,
          categoryId: true,
          category: { select: { name: true, color: true } },
          assets: { where: { type: 'ICON' }, take: 1 },
        },
      }),
      prisma.appVersion.findMany({
        select: { fileSize: true, downloads: true },
      }),
      prisma.appVersion.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          app: {
            select: {
              id: true,
              name: true,
              slug: true,
              assets: { where: { type: 'ICON' }, take: 1 },
            },
          },
        },
      }),
      prisma.analyticsEvent.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          app: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.category.findMany({
        include: {
          _count: { select: { apps: true } },
        },
      }),
    ]);

    // Aggregate downloads & storage
    const totalDownloads = apps.reduce((sum, a) => sum + (a.downloads || 0), 0);
    const totalPageViews = apps.reduce((sum, a) => sum + (a.pageViews || 0), 0);
    const totalStorageBytes = versions.reduce((sum, v) => sum + (v.fileSize || 0), 0);

    // Calculate 30-day download trend from analytics events or generate aggregated time-series
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const downloadEvents = await prisma.analyticsEvent.findMany({
      where: {
        type: 'DOWNLOAD',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    const pageViewEvents = await prisma.analyticsEvent.findMany({
      where: {
        type: 'PAGE_VIEW',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    // Bucket by day (YYYY-MM-DD)
    const dailyDataMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyDataMap[dateKey] = { date: dateKey, label: displayDate, downloads: 0, views: 0 };
    }

    downloadEvents.forEach((ev) => {
      const k = ev.createdAt.toISOString().split('T')[0];
      if (dailyDataMap[k]) {
        dailyDataMap[k].downloads += 1;
      }
    });

    pageViewEvents.forEach((ev) => {
      const k = ev.createdAt.toISOString().split('T')[0];
      if (dailyDataMap[k]) {
        dailyDataMap[k].views += 1;
      }
    });

    const dailyTrend = Object.values(dailyDataMap);

    // Top apps by download
    const topApps = [...apps]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 5);

    return apiResponse({
      stats: {
        totalApps,
        publishedApps,
        draftApps,
        archivedApps,
        totalDownloads,
        totalPageViews,
        totalReleases,
        publishedReleases,
        totalStorageBytes,
      },
      dailyTrend,
      topApps,
      recentReleases,
      recentEvents,
      categories,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return apiError(error.message || 'Failed to fetch stats', 500);
  }
}
