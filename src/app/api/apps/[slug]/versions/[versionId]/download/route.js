import prisma from '@/lib/db';
import { apiError } from '@/lib/utils';
import { resolveBuildDownload, recordDownload } from '@/lib/downloads';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { slug, versionId } = await params;

    const app = await prisma.app.findUnique({
      where: { slug },
    });

    if (!app) {
      return apiError(`App with slug "${slug}" not found`, 404);
    }

    const version = await prisma.appVersion.findFirst({
      where: {
        id: versionId,
        appId: app.id,
      },
    });

    if (!version) {
      return apiError(`Version "${versionId}" not found for app "${slug}"`, 404);
    }

    const resolved = await resolveBuildDownload({ app, version });

    if (!resolved.ok) {
      console.error(
        `[download] Build file unavailable for ${app.slug} v${version.versionName} — ` +
          `stored reference: ${version.filePath || '(none)'} — ${resolved.reason}`
      );
      return apiError(resolved.message, resolved.status);
    }

    await recordDownload({ request, app, version });

    return resolved.response;
  } catch (error) {
    console.error('Error handling specific version download:', error);
    return apiError(error.message || 'Failed to download version', 500);
  }
}

