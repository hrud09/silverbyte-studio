import fs from 'fs';
import path from 'path';
import { Readable } from 'node:stream';
import prisma from '@/lib/db';
import { normalizeStorageKey } from '@/lib/storage';
import { isGitHubStorageConfigured, findAsset } from '@/lib/githubStorage';
import { PROXY_DOWNLOAD_MAX_BYTES } from '@/lib/constants';

/**
 * Is this build small enough to be worth proxying for progress reporting?
 * @param {number} size
 * @returns {boolean}
 */
export function isProgressTrackable(size) {
  return Number(size) > 0 && Number(size) <= PROXY_DOWNLOAD_MAX_BYTES;
}

/**
 * Pipe a remote build back to the caller from our own origin.
 *
 * The upstream body is passed straight through, never buffered: this server holds
 * one chunk at a time regardless of how big the build is. Content-Length is taken
 * from storage rather than the upstream response so the client gets a total to
 * measure against even if the CDN answers with chunked encoding.
 *
 * @param {string} url - upstream (storage) URL
 * @param {string} downloadFileName
 * @param {number} size
 * @returns {Promise<Response|null>} null when the upstream fetch fails
 */
async function streamThroughServer(url, downloadFileName, size) {
  try {
    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) {
      console.warn(`[download] Upstream fetch for proxying failed: ${upstream.status}`);
      return null;
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${downloadFileName.replace(/"/g, '')}"`,
        'Content-Length': String(size),
        // The client reads this to distinguish a real total from a chunked stream.
        'X-Download-Proxied': '1',
      },
    });
  } catch (err) {
    console.warn(`[download] Could not proxy build: ${err.message}`);
    return null;
  }
}

/**
 * Resolve a version's stored build into something we can hand the browser.
 *
 * Order matters: a direct CDN redirect to GitHub Releases is preferred over streaming
 * bytes through this server, because the server is the memory-constrained hop.
 *
 * @param {Object} params
 * @param {Object} params.app
 * @param {Object} params.version
 * @param {boolean} [params.proxy=false] - Stream the bytes through this server rather
 *   than redirecting, so the client can watch progress. Only honoured for builds
 *   within PROXY_DOWNLOAD_MAX_BYTES; anything larger silently redirects instead.
 * @param {boolean} [params.forceProxy=false] - Proxy regardless of size, because the
 *   storage URL itself must not reach the client. Private Quick Shares set this: a 302
 *   would put the permanent, unauthenticated storage URL in the recipient's history and
 *   devtools, which survives the share being revoked. The size cap does not apply — it
 *   guards the *client's* memory while tracking XHR progress, and a plain navigation
 *   streams to disk instead. Egress is the deliberate cost of the link being the credential.
 * @returns {Promise<{ ok: true, response: Response } | { ok: false, status: number, message: string, reason: string }>}
 */
export async function resolveBuildDownload({ app, version, proxy = false, forceProxy = false }) {
  const downloadFileName = version.fileName || `${app.slug}-v${version.versionName}.apk`;

  if (!version.filePath) {
    return {
      ok: false,
      status: 404,
      reason: 'No filePath recorded on the version',
      message: `No build file has been uploaded for "${app.name}" v${version.versionName} yet.`,
    };
  }

  // 1. GitHub Releases, by key or asset lookup.
  if (isGitHubStorageConfigured()) {
    const asset = await findAsset(normalizeStorageKey(version.filePath));
    if (asset) {
      if (forceProxy || (proxy && isProgressTrackable(asset.size))) {
        const streamed = await streamThroughServer(asset.url, downloadFileName, asset.size);
        if (streamed) return { ok: true, response: streamed };
        if (forceProxy) {
          return {
            ok: false,
            status: 502,
            reason: `Could not proxy ${asset.url} and a redirect would expose it`,
            message: `The build for "${app.name}" could not be fetched from storage. Please try again in a moment.`,
          };
        }
      }
      return { ok: true, response: Response.redirect(asset.url, 302) };
    }
  }

  // 2. An absolute URL pointing somewhere directly (e.g. direct GitHub asset download URL).
  if (/^https?:\/\//.test(version.filePath)) {
    if (forceProxy || (proxy && isProgressTrackable(version.fileSize))) {
      const streamed = await streamThroughServer(version.filePath, downloadFileName, version.fileSize);
      if (streamed) return { ok: true, response: streamed };
      if (forceProxy) {
        return {
          ok: false,
          status: 502,
          reason: `Could not proxy ${version.filePath} and a redirect would expose it`,
          message: `The build for "${app.name}" could not be fetched from storage. Please try again in a moment.`,
        };
      }
    }
    return { ok: true, response: Response.redirect(version.filePath, 302) };
  }

  // 4. Local disk — stream it rather than buffering a whole APK into memory.
  const cleanRelative = normalizeStorageKey(version.filePath);
  const baseName = path.basename(cleanRelative);
  const candidatePaths = [
    path.join(process.cwd(), 'public', cleanRelative),
    path.join(process.cwd(), 'public', 'builds', baseName),
    path.join(process.cwd(), 'public', 'uploads', cleanRelative),
    path.join(process.cwd(), 'public', 'uploads', 'builds', baseName),
    path.join(process.cwd(), 'storage', cleanRelative),
    path.join(process.cwd(), 'storage', 'builds', baseName),
    path.join(process.cwd(), 'storage', 'uploads', cleanRelative),
  ];

  for (const candidate of candidatePaths) {
    try {
      const stat = fs.statSync(/*turbopackIgnore: true*/ candidate);
      if (!stat.isFile()) continue;

      const webStream = Readable.toWeb(fs.createReadStream(/*turbopackIgnore: true*/ candidate));
      return {
        ok: true,
        response: new Response(webStream, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Disposition': `attachment; filename="${downloadFileName.replace(/"/g, '')}"`,
            'Content-Length': stat.size.toString(),
          },
        }),
      };
    } catch {
      // Not at this path, keep looking
    }
  }

  return {
    ok: false,
    status: 404,
    reason: `Reference "${version.filePath}" resolved to no object in storage and no file on disk`,
    message:
      `The build file for "${app.name}" v${version.versionName} is missing from storage. ` +
      `It was recorded as uploaded, but the file is not there — re-upload this version from the admin panel.`,
  };
}

/**
 * The storage URL for a build, if the file is somewhere the public internet can reach.
 *
 * This is the same ladder `resolveBuildDownload` climbs, stopped one rung early: the
 * address rather than a response. It exists for the case this server cannot serve —
 * a store running only on a laptop, where no link through this origin can survive
 * leaving the building, but the build itself is already sitting on a CDN.
 *
 * Handing this URL out gives up everything the share token buys: it cannot be revoked,
 * it is not counted, and it does not expire (except for a signed R2 URL, which expires
 * too soon to be useful for anything else). Callers must decide that trade deliberately
 * — `permanent` says which kind of URL came back.
 *
 * @param {string} filePath - storage key or absolute URL, as recorded on the row
 * @param {string} [downloadFileName] - name to suggest, where the backend supports it
 * @returns {Promise<{ url: string, backend: 'github'|'r2'|'external', permanent: boolean } | null>}
 *   null when the build lives only on this machine's disk
 */
export async function resolveStorageUrl(filePath, downloadFileName) {
  if (!filePath) return null;

  if (isGitHubStorageConfigured()) {
    const asset = await findAsset(normalizeStorageKey(filePath));
    // Release assets on a public repo are permanent URLs on GitHub's CDN.
    if (asset) return { url: asset.url, backend: 'github', permanent: true };
  }

  if (/^https?:\/\//.test(filePath)) {
    return { url: filePath, backend: 'external', permanent: true };
  }

  return null;
}

/**
 * Record a download against the app, the version, and the analytics log.
 * Best-effort: a stats failure must never turn a working download into an error.
 */
export async function recordDownload({ request, app, version }) {
  try {
    await Promise.all([
      prisma.app.update({
        where: { id: app.id },
        data: { downloads: { increment: 1 } },
      }),
      prisma.appVersion.update({
        where: { id: version.id },
        data: { downloads: { increment: 1 } },
      }),
      prisma.analyticsEvent.create({
        data: {
          type: 'DOWNLOAD',
          appId: app.id,
          appVersionId: version.id,
          metadata: JSON.stringify({
            userAgent: request.headers.get('user-agent') || 'unknown',
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            versionCode: version.versionCode,
            versionName: version.versionName,
          }),
        },
      }),
    ]);
  } catch (e) {
    console.warn('Could not record download analytics event:', e.message);
  }
}
