import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { resolveStorageUrl } from '@/lib/downloads';
import { buildDownloadFileName } from '@/lib/quickShare';

export const dynamic = 'force-dynamic';

/**
 * The build's own address in storage, bypassing this server entirely.
 *
 * The escape hatch for a store that is not deployed anywhere. `/s/<token>` is only as
 * reachable as the machine serving it, but the build itself already sits on a CDN, and
 * that URL works from any network on earth without this server being awake.
 *
 * What it costs: the token stops being the credential. This URL cannot be revoked, is
 * never counted as a download, and keeps working after the share is deleted from the
 * console — GitHub only stops serving it once the release asset itself is gone. That is
 * an acceptable trade for a build the operator already marked public, and no trade at
 * all for a private one, which is why this refuses those outright rather than leaving
 * the choice to a click.
 */
export async function GET(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { id } = await params;
    const share = await prisma.quickShare.findUnique({ where: { id } });
    if (!share) {
      return apiError('Share not found', 404);
    }

    if (share.isPrivate) {
      return apiError(
        'This share is private. A direct storage link cannot be revoked and would outlive the share — switch it to public first if that is what you want.',
        409
      );
    }

    const resolved = await resolveStorageUrl(
      share.filePath,
      buildDownloadFileName(share.title, share.fileName)
    );

    if (!resolved) {
      return apiError(
        'This build is stored on the server’s own disk, so it has no address of its own. Configure GitHub Releases cloud storage and re-upload it to share it without this server.',
        409
      );
    }

    return apiResponse(resolved);
  } catch (error) {
    console.error('Error resolving direct link for quick share:', error);
    return apiError(error.message || 'Failed to resolve a direct link', 500);
  }
}
