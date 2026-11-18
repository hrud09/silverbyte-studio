import prisma from '@/lib/db';
import { deleteFile } from '@/lib/storage';

/**
 * Server-side helpers for Quick Share lifecycle management and expiration cleanup.
 */

/**
 * Delete a quick share record and its associated build file from storage.
 *
 * @param {string} id - QuickShare id
 * @param {import('@prisma/client').PrismaClient} [client]
 * @returns {Promise<{ deleted: boolean, fileDeleted: boolean }>}
 */
export async function deleteQuickShare(id, client = prisma) {
  const share = await client.quickShare.findUnique({ where: { id } });
  if (!share) return { deleted: false, fileDeleted: false };

  // Drop row first so the link dies immediately even if file removal takes time
  await client.quickShare.delete({ where: { id } });

  let fileDeleted = false;
  if (share.filePath) {
    try {
      fileDeleted = await deleteFile(share.filePath);
    } catch (err) {
      console.warn(`[quick-share] Could not delete stored file for ${share.token}:`, err.message);
    }
  }

  return { deleted: true, fileDeleted };
}

/**
 * Scan for and delete all expired quick share records and their stored build binaries.
 * Safe to call opportunistically on listing or download requests.
 *
 * @param {import('@prisma/client').PrismaClient} [client]
 * @returns {Promise<{ cleanedCount: number, expiredIds: string[] }>}
 */
export async function cleanupExpiredQuickShares(client = prisma) {
  try {
    const now = new Date();
    const expiredShares = await client.quickShare.findMany({
      where: {
        expiresAt: {
          not: null,
          lte: now,
        },
      },
    });

    if (!expiredShares || expiredShares.length === 0) {
      return { cleanedCount: 0, expiredIds: [] };
    }

    const expiredIds = expiredShares.map((s) => s.id);

    // Delete the database records
    await client.quickShare.deleteMany({
      where: {
        id: { in: expiredIds },
      },
    });

    // Delete associated files from storage
    for (const share of expiredShares) {
      if (share.filePath) {
        try {
          await deleteFile(share.filePath);
        } catch (err) {
          console.warn(`[quick-share] Failed to delete expired file for ${share.token}:`, err.message);
        }
      }
    }

    console.info(`[quick-share] Cleaned up ${expiredShares.length} expired share(s)`);
    return { cleanedCount: expiredShares.length, expiredIds };
  } catch (err) {
    console.warn('[quick-share] Error during expired shares cleanup:', err.message);
    return { cleanedCount: 0, expiredIds: [] };
  }
}
