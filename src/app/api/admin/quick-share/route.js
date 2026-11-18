import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { verifyStorageKeyExists } from '@/lib/storage';
import { generateShareToken, serializeShare, calculateExpiresAt } from '@/lib/quickShare';
import { cleanupExpiredQuickShares } from '@/lib/quickShare.server';
import { resolvePublicBaseUrl } from '@/lib/publicUrl.server';

export const dynamic = 'force-dynamic';

/**
 * List every share, newest first. Admin-only — these links are credentials.
 * Automatically cleans up expired shares.
 *
 * The resolved link address rides along with the rows so the console can warn before
 * a link is sent rather than after it fails to open.
 */
export async function GET(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    // Proactively clean up any shares that have passed their expiration time
    await cleanupExpiredQuickShares(prisma);

    const [shares, link] = await Promise.all([
      prisma.quickShare.findMany({ orderBy: { createdAt: 'desc' } }),
      resolvePublicBaseUrl(request),
    ]);

    return apiResponse({
      shares: shares.map((share) => serializeShare(share, link)),
      link,
    });
  } catch (error) {
    console.error('Error listing quick shares:', error);
    return apiError(error.message || 'Failed to load shares', 500);
  }
}

/**
 * Create a share from an already-uploaded build.
 *
 * The token is minted here rather than accepted from the client: it is the only thing
 * guarding a private build, so the server keeps sole authority over how it is generated.
 */
export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const body = await request.json();
    const { title, fileUrl, fileName, fileSize, isPrivate = true, expiresIn, expiresAt } = body;

    if (!title || !String(title).trim()) {
      return apiError('A title is required', 400);
    }
    if (!fileUrl) {
      return apiError('An uploaded file is required', 400);
    }

    // The client calls an upload "done" from its own side of the wire. Confirm the
    // object is really in storage before handing out a link that promises it.
    if (!(await verifyStorageKeyExists(fileUrl))) {
      return apiError('The uploaded file could not be found in storage. Please upload it again.', 422);
    }

    // Calculate expiry timestamp (if set)
    const computedExpiresAt = calculateExpiresAt(expiresIn, expiresAt);

    // Collisions are vanishingly unlikely at 20 characters, but a share whose token
    // silently shadowed another would be a quiet disaster, so retry rather than trust.
    let token = generateShareToken();
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!(await prisma.quickShare.findUnique({ where: { token } }))) break;
      token = generateShareToken();
    }

    const share = await prisma.quickShare.create({
      data: {
        token,
        title: String(title).trim().slice(0, 200),
        fileName: String(fileName || 'app.apk').slice(0, 255),
        filePath: fileUrl,
        fileSize: Number(fileSize) || 0,
        isPrivate: Boolean(isPrivate),
        expiresAt: computedExpiresAt,
      },
    });

    return apiResponse(serializeShare(share, await resolvePublicBaseUrl(request)), 201);
  } catch (error) {
    console.error('Error creating quick share:', error);
    return apiError(error.message || 'Failed to create share', 500);
  }
}
