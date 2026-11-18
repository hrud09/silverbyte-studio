import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { deleteFile } from '@/lib/storage';
import { serializeShare } from '@/lib/quickShare';
import { resolvePublicBaseUrl } from '@/lib/publicUrl.server';

export const dynamic = 'force-dynamic';

/** Toggle visibility, or revoke/restore the link without losing the record. */
export async function PATCH(request, { params }) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { id } = await params;
    const body = await request.json();

    const data = {};
    if (typeof body.isPrivate === 'boolean') data.isPrivate = body.isPrivate;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 200);
    if ('expiresAt' in body || 'expiresIn' in body) {
      const { calculateExpiresAt } = await import('@/lib/quickShare');
      data.expiresAt = calculateExpiresAt(body.expiresIn, body.expiresAt);
    }

    if (Object.keys(data).length === 0) {
      return apiError('Nothing to update', 400);
    }

    const existing = await prisma.quickShare.findUnique({ where: { id } });
    if (!existing) {
      return apiError('Share not found', 404);
    }

    const share = await prisma.quickShare.update({ where: { id }, data });
    return apiResponse(serializeShare(share, await resolvePublicBaseUrl(request)));
  } catch (error) {
    console.error('Error updating quick share:', error);
    return apiError(error.message || 'Failed to update share', 500);
  }
}

/** Delete the share and the build behind it. */
export async function DELETE(request, { params }) {
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

    // Drop the row first. If storage cleanup fails the link is already dead, which is
    // the outcome that matters; the reverse order could leave a live link to a file
    // that is no longer there.
    await prisma.quickShare.delete({ where: { id } });

    let fileDeleted = false;
    try {
      fileDeleted = await deleteFile(share.filePath);
    } catch (err) {
      console.warn(`[quick-share] Could not delete stored build for ${share.token}:`, err.message);
    }

    return apiResponse({ deleted: true, fileDeleted });
  } catch (error) {
    console.error('Error deleting quick share:', error);
    return apiError(error.message || 'Failed to delete share', 500);
  }
}
