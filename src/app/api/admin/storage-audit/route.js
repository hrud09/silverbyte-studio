import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { normalizeStorageKey, getActiveBackend } from '@/lib/storage';
import { isGitHubStorageConfigured, listAllAssets, keyToLocation } from '@/lib/githubStorage';

export const dynamic = 'force-dynamic';

/**
 * Every stored reference the DB believes in, flattened into one shape so builds
 * and media can be audited by the same matcher.
 */
async function collectReferences() {
  const [versions, assets] = await Promise.all([
    prisma.appVersion.findMany({
      where: { filePath: { not: null } },
      include: { app: { select: { slug: true, name: true } } },
    }),
    prisma.appAsset.findMany({
      include: { app: { select: { slug: true, name: true } } },
    }),
  ]);

  return [
    ...versions.map((v) => ({
      kind: 'build',
      appSlug: v.app?.slug || '(orphaned)',
      appName: v.app?.name || '(orphaned)',
      label: `v${v.versionName} (${v.status})`,
      reference: v.filePath,
      expectedSize: v.fileSize || 0,
    })),
    ...assets.map((a) => ({
      kind: a.type.toLowerCase(),
      appSlug: a.app?.slug || '(orphaned)',
      appName: a.app?.name || '(orphaned)',
      label: a.fileName || a.type,
      reference: a.url,
      expectedSize: 0,
    })),
  ];
}

/**
 * Locate a reference on local disk, mirroring the candidate paths the file-serving
 * route checks so the audit agrees with what a real request would find.
 */
function findOnDisk(key) {
  const baseName = path.basename(key);
  const candidates = [
    path.join(process.cwd(), 'public', key),
    path.join(process.cwd(), 'public', 'builds', baseName),
    path.join(process.cwd(), 'public', 'uploads', key),
    path.join(process.cwd(), 'storage', key),
    path.join(process.cwd(), 'storage', 'uploads', key),
    path.join(process.cwd(), 'storage', 'builds', baseName),
  ];
  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(/*turbopackIgnore: true*/ candidate);
      if (stat.isFile()) return { path: candidate, size: stat.size };
    } catch {
      // Not at this path, keep looking
    }
  }
  return null;
}

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const references = await collectReferences();
    const backend = getActiveBackend();
    const usingGitHub = isGitHubStorageConfigured();

    // One listing beats a per-reference existence check, and it also reveals orphans —
    // objects occupying storage that nothing in the DB points at.
    const objects = usingGitHub ? await listAllAssets() : [];
    const objectsByKey = new Map(objects.map((o) => [o.key, o]));

    const matchedKeys = new Set();

    const results = references.map((ref) => {
      // An external URL (developer pasted a link elsewhere) isn't ours to verify.
      const isExternal = /^(https?:)?\/\//.test(ref.reference);

      if (isExternal) {
        return { ...ref, status: 'external', foundKey: null, actualSize: null };
      }

      const key = normalizeStorageKey(ref.reference);
      if (!key) {
        return { ...ref, status: 'missing', foundKey: null, actualSize: null, reason: 'Empty reference' };
      }

      if (usingGitHub) {
        // The same key spellings a real lookup would try, matched in memory.
        const candidates = [key];
        const { folder, assetName } = keyToLocation(key);
        candidates.push(`${folder}/${assetName}`);
        if (!key.startsWith('uploads/')) candidates.push(`uploads/${key}`);
        if (key.startsWith('uploads/')) candidates.push(key.replace(/^uploads\//, ''));
        if (!key.startsWith('builds/') && !key.includes('/')) candidates.push(`builds/${key}`);

        for (const candidate of candidates) {
          const hit = objectsByKey.get(candidate);
          if (hit) {
            matchedKeys.add(candidate);
            return {
              ...ref,
              status: 'ok',
              foundKey: candidate,
              actualSize: hit.size,
              exactMatch: candidate === key,
            };
          }
        }
        return {
          ...ref,
          status: 'missing',
          foundKey: null,
          actualSize: null,
          reason: `No stored object under any of: ${candidates.join(', ')}`,
        };
      }

      const onDisk = findOnDisk(key);
      return onDisk
        ? { ...ref, status: 'ok', foundKey: onDisk.path, actualSize: onDisk.size, exactMatch: true }
        : { ...ref, status: 'missing', foundKey: null, actualSize: null, reason: 'Not found on local disk' };
    });

    const orphans = objects
      .filter((o) => !matchedKeys.has(o.key))
      .map((o) => ({ key: o.key, size: o.size, lastModified: o.lastModified }));

    const broken = results.filter((r) => r.status === 'missing');

    return apiResponse({
      backend,
      container: usingGitHub ? process.env.GITHUB_REPO : 'local disk',
      summary: {
        referencesChecked: results.length,
        ok: results.filter((r) => r.status === 'ok').length,
        missing: broken.length,
        external: results.filter((r) => r.status === 'external').length,
        objectsStored: objects.length,
        orphanedObjects: orphans.length,
        orphanedBytes: orphans.reduce((sum, o) => sum + o.size, 0),
      },
      broken,
      results,
      orphans: orphans.slice(0, 50),
    });
  } catch (error) {
    console.error('Storage audit error:', error);
    return apiError(error.message || 'Failed to audit storage', 500);
  }
}
