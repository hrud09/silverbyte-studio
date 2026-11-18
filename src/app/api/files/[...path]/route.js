import fs from 'fs';
import path from 'path';
import { Readable } from 'node:stream';
import { apiError } from '@/lib/utils';
import { getActiveBackend } from '@/lib/storage';
import { isGitHubStorageConfigured, findAsset } from '@/lib/githubStorage';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.apk': 'application/vnd.android.package-archive',
  '.aab': 'application/octet-stream',
  '.ipa': 'application/octet-stream',
  '.exe': 'application/x-msdownload',
  '.msi': 'application/x-msdownload',
  '.dmg': 'application/x-apple-diskimage',
  '.zip': 'application/zip',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request, { params }) {
  try {
    const { path: subPathSegments } = await params;

    if (!subPathSegments || !Array.isArray(subPathSegments) || subPathSegments.length === 0) {
      return apiError('File path parameter is required', 400);
    }

    // Sanitize path
    const safeSubPath = subPathSegments
      .map((segment) => segment.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\.]/g, ''))
      .join('/');

    const ext = path.extname(safeSubPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileName = path.basename(safeSubPath);

    // 1. GitHub Releases: redirect rather than proxy. Serving the bytes ourselves
    // would spend this server's bandwidth on a file GitHub will deliver for free.
    if (isGitHubStorageConfigured()) {
      const asset = await findAsset(safeSubPath);
      if (asset) {
        return Response.redirect(asset.url, 302);
      }
    }

    // 2. Check local disk candidate directories
    const nativeSafePath = subPathSegments
      .map((segment) => segment.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_\-\.]/g, ''))
      .join(path.sep);
    const baseFileName = path.basename(nativeSafePath);

    const candidatePaths = [
      path.resolve(process.cwd(), 'public', nativeSafePath),
      path.resolve(process.cwd(), 'public', 'builds', baseFileName),
      path.resolve(process.cwd(), 'public', 'icon', baseFileName),
      path.resolve(process.cwd(), 'public', 'feature', baseFileName),
      path.resolve(process.cwd(), 'public', 'screenshot', baseFileName),
      path.resolve(process.cwd(), 'public', 'uploads', nativeSafePath),
      path.resolve(process.cwd(), 'public', 'uploads', 'builds', baseFileName),
      path.resolve(process.cwd(), 'public', 'uploads', 'icon', baseFileName),
      path.resolve(process.cwd(), 'public', 'uploads', 'feature', baseFileName),
      path.resolve(process.cwd(), 'public', 'uploads', 'screenshot', baseFileName),
      path.resolve(process.cwd(), 'storage', 'uploads', nativeSafePath),
      path.resolve(process.cwd(), 'storage', 'builds', baseFileName),
      path.resolve(process.cwd(), 'storage', 'icon', baseFileName),
      path.resolve(process.cwd(), 'storage', 'feature', baseFileName),
      path.resolve(process.cwd(), 'storage', 'screenshot', baseFileName),
      path.resolve(process.cwd(), 'storage', nativeSafePath),
    ];

    for (const fullFilePath of candidatePaths) {
      if (fs.existsSync(/*turbopackIgnore: true*/ fullFilePath)) {
        const stat = fs.statSync(/*turbopackIgnore: true*/ fullFilePath);
        if (stat.isFile()) {
          return new Response(Readable.toWeb(fs.createReadStream(/*turbopackIgnore: true*/ fullFilePath)), {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': stat.size.toString(),
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
              'Content-Disposition': mimeType.startsWith('image/')
                ? 'inline'
                : `attachment; filename="${fileName.replace(/"/g, '')}"`,
            },
          });
        }
      }
    }

    // 4. Fallback for missing images: a placeholder beats a broken <img>, but it must
    // not be silent — an asset vanishing from storage should be visible in the logs,
    // not disguised as a design choice. /api/admin/storage-audit lists every such case.
    if (mimeType.startsWith('image/')) {
      console.warn(`[files] Asset missing from ${getActiveBackend()} storage, serving placeholder: ${safeSubPath}`);
      const placeholderType = safeSubPath.includes('feature')
        ? 'feature'
        : safeSubPath.includes('screenshot')
        ? 'screenshot'
        : 'icon';
      const cleanSlug = fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/^[0-9]+-/, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '') || 'app';
      return Response.redirect(new URL(`/api/placeholder/${placeholderType}/${cleanSlug}`, request.url), 307);
    }

    console.error(`[files] Not found in ${getActiveBackend()} storage: ${safeSubPath}`);
    return apiError(`File not found in storage: ${safeSubPath}`, 404);
  } catch (error) {
    console.error('Error serving file:', error);
    return apiError(error.message || 'Failed to serve file', 500);
  }
}

