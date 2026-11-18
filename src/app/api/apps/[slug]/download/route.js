import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { resolveBuildDownload, recordDownload, isProgressTrackable } from '@/lib/downloads';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    // Preflight: the client asks "is this actually downloadable?" so it can show a
    // real message instead of navigating into a JSON error page. Never counts a download.
    const searchParams = new URL(request.url).searchParams;
    const isCheck = searchParams.get('check') === '1';
    // The client opts into proxying only after the preflight tells it the build is
    // small enough; asking for it on a large one is ignored downstream.
    const wantsProxy = searchParams.get('proxy') === '1';

    const app = await prisma.app.findUnique({
      where: { slug },
      include: {
        versions: {
          orderBy: { versionCode: 'desc' },
        },
      },
    });

    if (!app) {
      return apiError(`App with slug "${slug}" not found`, 404);
    }

    const latestVersion = app.versions.find((v) => v.status === 'PUBLISHED') || app.versions[0] || null;

    if (!latestVersion) {
      return apiError(`"${app.name}" has no releases yet.`, 404);
    }

    const resolved = await resolveBuildDownload({ app, version: latestVersion, proxy: wantsProxy });

    if (!resolved.ok) {
      // Deliberately a real failure, not a placeholder file. A store that hands back
      // a fake APK with HTTP 200 makes a broken build indistinguishable from a working
      // one — which is exactly how a missing upload stays invisible for weeks.
      console.error(
        `[download] Build file unavailable for ${app.slug} v${latestVersion.versionName} — ` +
          `stored reference: ${latestVersion.filePath || '(none)'} — ${resolved.reason}`
      );
      return apiError(resolved.message, resolved.status);
    }

    if (isCheck) {
      return apiResponse({
        available: true,
        fileName: latestVersion.fileName || `${app.slug}-v${latestVersion.versionName}.apk`,
        fileSize: latestVersion.fileSize || 0,
        versionName: latestVersion.versionName,
        // Whether the client can show a real percentage, or should hand the transfer
        // to the browser and settle for an indeterminate state.
        trackable: isProgressTrackable(latestVersion.fileSize),
      });
    }

    await recordDownload({ request, app, version: latestVersion });

    return resolved.response;
  } catch (error) {
    console.error('Error handling app download:', error);
    return apiError(error.message || 'Failed to download app', 500);
  }
}

