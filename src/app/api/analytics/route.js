import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range');
    const daysParam = searchParams.get('days');

    let rangeDays = 30;
    if (rangeParam === '7d') rangeDays = 7;
    else if (rangeParam === '30d') rangeDays = 30;
    else if (rangeParam === '90d') rangeDays = 90;
    else if (rangeParam === 'all') rangeDays = 365;
    else if (daysParam) {
      const parsed = parseInt(daysParam, 10);
      if (!isNaN(parsed) && parsed > 0) rangeDays = parsed;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);
    startDate.setHours(0, 0, 0, 0);

    // 1. Fetch aggregate metrics, apps, categories, and telemetry events
    const [
      totalApps,
      totalPublishedApps,
      totalDownloadsAggregate,
      totalPageViewsAggregate,
      allPublishedApps,
      categoriesWithApps,
      downloadEvents,
      pageViewEvents,
      recentEventsList,
    ] = await Promise.all([
      prisma.app.count(),
      prisma.app.count({ where: { status: 'PUBLISHED' } }),
      prisma.app.aggregate({
        _sum: { downloads: true },
      }),
      prisma.app.aggregate({
        _sum: { pageViews: true },
      }),
      // Published apps with details
      prisma.app.findMany({
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          slug: true,
          name: true,
          downloads: true,
          pageViews: true,
          category: { select: { id: true, name: true, color: true, slug: true } },
          assets: { where: { type: 'ICON' }, take: 1, select: { filePath: true } },
        },
      }),
      // Categories with app totals
      prisma.category.findMany({
        include: {
          apps: {
            select: {
              id: true,
              downloads: true,
              pageViews: true,
            },
          },
        },
      }),
      // Download events in time window
      prisma.analyticsEvent.findMany({
        where: {
          type: 'DOWNLOAD',
          createdAt: { gte: startDate },
        },
        select: {
          appId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // Page view events in time window
      prisma.analyticsEvent.findMany({
        where: {
          type: 'PAGE_VIEW',
          createdAt: { gte: startDate },
        },
        select: {
          appId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // Recent event log (last 20)
      prisma.analyticsEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          app: { select: { name: true, slug: true } },
          appVersion: { select: { versionName: true } },
        },
      }),
    ]);

    // Period calculations
    const periodDownloads = downloadEvents.length;
    const periodViews = pageViewEvents.length;
    const conversionRate = periodViews > 0
      ? `${((periodDownloads / periodViews) * 100).toFixed(1)}%`
      : '0%';

    const totalDownloads = totalDownloadsAggregate._sum.downloads || 0;
    const totalViews = totalPageViewsAggregate._sum.pageViews || 0;

    // Timeline buckets
    const dailyMap = {};
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[key] = { date: key, label: displayDate, downloads: 0, views: 0 };
    }

    for (const evt of downloadEvents) {
      const dayKey = evt.createdAt.toISOString().split('T')[0];
      if (dailyMap[dayKey]) {
        dailyMap[dayKey].downloads += 1;
      }
    }

    for (const evt of pageViewEvents) {
      const dayKey = evt.createdAt.toISOString().split('T')[0];
      if (dailyMap[dayKey]) {
        dailyMap[dayKey].views += 1;
      }
    }

    const timeline = Object.values(dailyMap);

    // Per-app period download map
    const appPeriodDownloadsMap = {};
    for (const evt of downloadEvents) {
      if (evt.appId) {
        appPeriodDownloadsMap[evt.appId] = (appPeriodDownloadsMap[evt.appId] || 0) + 1;
      }
    }

    // Top apps ranked by total downloads
    const topApps = allPublishedApps
      .map((app) => {
        const appConversion = app.pageViews > 0
          ? ((app.downloads / app.pageViews) * 100).toFixed(1)
          : '0.0';
        return {
          id: app.id,
          slug: app.slug,
          name: app.name,
          category: app.category?.name || 'Uncategorized',
          categoryColor: app.category?.color || '#D32F2F',
          periodDownloads: appPeriodDownloadsMap[app.id] || 0,
          totalDownloads: app.downloads || 0,
          totalViews: app.pageViews || 0,
          conversionRate: appConversion,
        };
      })
      .sort((a, b) => b.totalDownloads - a.totalDownloads)
      .slice(0, 10);

    // Category distribution breakdown
    const categoryBreakdown = categoriesWithApps.map((cat) => {
      const catDownloads = cat.apps.reduce((sum, a) => sum + (a.downloads || 0), 0);
      const catViews = cat.apps.reduce((sum, a) => sum + (a.pageViews || 0), 0);
      const catConversion = catViews > 0
        ? ((catDownloads / catViews) * 100).toFixed(1)
        : '0.0';

      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        slug: cat.slug,
        appCount: cat.apps.length,
        downloads: catDownloads,
        pageViews: catViews,
        conversionRate: catConversion,
      };
    });

    return apiResponse({
      kpis: {
        periodDownloads,
        periodViews,
        conversionRate,
        totalApps: totalPublishedApps,
        totalDownloads,
        totalViews,
      },
      summary: {
        totalApps,
        totalPublishedApps,
        totalDownloads,
        totalPageViews: totalViews,
      },
      timeline,
      topApps,
      categoryBreakdown,
      categoryStats: categoryBreakdown,
      recentEvents: recentEventsList,
    });
  } catch (error) {
    console.error('Error in analytics endpoint:', error);
    return apiError(error.message || 'Failed to fetch analytics', 500);
  }
}
