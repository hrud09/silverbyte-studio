import prisma from '@/lib/db';
import { apiError } from '@/lib/utils';
import { resolveBuildDownload } from '@/lib/downloads';
import { buildDownloadFileName } from '@/lib/quickShare';

import { deleteQuickShare } from '@/lib/quickShare.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// A private share streams through this server, so the route lives as long as the download.
export const maxDuration = 900;

/**
 * Serve the build behind a share token.
 *
 * The token is the whole authorisation story: no session, no lookup by id, and the
 * stored path never appears in a response. A revoked share stops working here even
 * though the file is still in storage.
 */
export async function GET(request, { params }) {
  try {
    const { token } = await params;

    const share = await prisma.quickShare.findUnique({ where: { token } });

    // A revoked link and a link that never existed answer identically: distinguishing
    // them would confirm to a probe that a given token was once real.
    if (!share || !share.isActive) {
      return apiError('This download link is no longer available.', 404);
    }

    // Auto-delete if expired
    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
      deleteQuickShare(share.id).catch((err) =>
        console.warn('[quick-share] Cleanup failed on expired download attempt:', err.message)
      );
      return apiError('This download link has expired.', 404);
    }

    const downloadFileName = buildDownloadFileName(share.title, share.fileName);

    const resolved = await resolveBuildDownload({
      // resolveBuildDownload speaks in apps and versions; a share is neither, but it
      // needs only a display name and a stored path, so hand it those.
      app: { name: share.title, slug: 'share' },
      version: {
        fileName: downloadFileName,
        filePath: share.filePath,
        fileSize: share.fileSize,
        versionName: '1.0',
      },
      // Private links must never redirect: a 302 would leak the permanent storage URL,
      // which keeps working after the share is revoked.
      forceProxy: share.isPrivate,
    });

    if (!resolved.ok) {
      console.error(`[quick-share] Download failed for ${share.token}: ${resolved.reason}`);
      return apiError(resolved.message, resolved.status);
    }

    // Best-effort: a stats write must never turn a working download into an error.
    prisma.quickShare
      .update({
        where: { id: share.id },
        data: { downloads: { increment: 1 }, lastDownloadAt: new Date() },
      })
      .catch((err) => console.warn('[quick-share] Could not record download:', err.message));

    return resolved.response;
  } catch (error) {
    console.error('Error serving quick share download:', error);
    return apiError('Could not prepare this download.', 500);
  }
}
