/**
 * Cloudflare R2 storage backend (S3-compatible API).
 *
 * Why R2 alongside GitHub Releases: R2 can hand the browser a presigned upload URL,
 * so build files go straight from the admin's browser into the bucket without passing
 * through this server. That is what makes serverless hosting (Vercel) possible — its
 * functions cap request bodies at a few MB, far below an APK.
 *
 * Objects are read back over the bucket's public URL (R2_PUBLIC_URL: a custom domain
 * such as https://files.silverbytestudio.com, or the bucket's r2.dev address). R2 does
 * not bill egress, so downloads redirect there exactly as they did to GitHub's CDN.
 *
 * Layout: the storage key is the object key, e.g. "builds/red-notes-v1-2.apk".
 */

import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');

/** How long a presigned upload URL stays valid. Long enough for a big APK on a slow link. */
const UPLOAD_URL_TTL_SECONDS = 60 * 60;

export function isR2StorageConfigured() {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_URL);
}

let client = null;
function getClient() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
      forcePathStyle: true,
      // Newer SDKs add CRC32 checksum params to every PutObject, which would be baked
      // into presigned URLs and then fail against a browser upload that never sends them.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

/** The public address an object is served from. */
export function publicUrlFor(key) {
  return `${PUBLIC_URL}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * Map a stored reference onto an R2 object key, or null if the reference cannot
 * belong to this bucket (e.g. a GitHub release URL or a link to another site).
 * Doing this check up front spares a pointless HEAD request per foreign reference.
 *
 * @param {string} ref - bare key, /api/files/... path, or absolute URL
 * @returns {string|null}
 */
export function toR2Key(ref) {
  if (!ref || typeof ref !== 'string') return null;
  let value = ref.trim();

  if (/^https?:\/\//i.test(value)) {
    if (!PUBLIC_URL || !value.toLowerCase().startsWith(`${PUBLIC_URL.toLowerCase()}/`)) return null;
    value = value.slice(PUBLIC_URL.length + 1).split(/[?#]/)[0];
    try {
      value = decodeURIComponent(value);
    } catch {
      // Malformed escape; use it as-is
    }
  }

  const key = value
    .replace(/^\/+/, '')
    .replace(/^storage[\\/]/, '')
    .replace(/^api\/files[\\/]/, '');
  return key || null;
}

/**
 * Look up a single object.
 *
 * @param {string} ref
 * @returns {Promise<{ key: string, name: string, size: number, url: string } | null>}
 */
export async function findObject(ref) {
  if (!isR2StorageConfigured()) return null;
  const key = toR2Key(ref);
  if (!key) return null;

  try {
    const head = await getClient().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return {
      key,
      name: key.split('/').pop(),
      size: Number(head.ContentLength || 0),
      url: publicUrlFor(key),
    };
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    if (status !== 404 && err?.name !== 'NotFound') {
      console.error(`[r2-storage] Lookup failed for ${key}:`, err.message);
    }
    return null;
  }
}

/**
 * Headers a browser upload must send for a given object. Content-Disposition is stored
 * with the object so a build saves under its readable name when downloaded; images are
 * left inline so they still render in <img> tags.
 */
export function uploadHeadersFor(key, contentType) {
  const headers = { 'Content-Type': contentType };
  if (!contentType.startsWith('image/')) {
    const fileName = key.split('/').pop().replace(/"/g, '');
    headers['Content-Disposition'] = `attachment; filename="${fileName}"`;
  }
  return headers;
}

/**
 * Create a presigned PUT URL the browser uploads to directly. The browser must send
 * exactly the headers returned here, because they are part of the signature.
 *
 * @returns {Promise<{ uploadUrl: string, headers: Record<string, string>, url: string, key: string }>}
 */
export async function createUploadUrl({ key, contentType = 'application/octet-stream' }) {
  const headers = uploadHeadersFor(key, contentType);
  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: headers['Content-Type'],
      ContentDisposition: headers['Content-Disposition'],
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS }
  );
  return { uploadUrl, headers, url: publicUrlFor(key), key };
}

/**
 * Server-side upload, used by the multipart /api/upload route for small files.
 *
 * @returns {Promise<{ url: string, key: string, size: number }>}
 */
export async function uploadObject({ body, size, key, contentType = 'application/octet-stream' }) {
  const headers = uploadHeadersFor(key, contentType);
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentLength: size,
      ContentType: headers['Content-Type'],
      ContentDisposition: headers['Content-Disposition'],
    })
  );
  return { url: publicUrlFor(key), key, size };
}

/**
 * Delete an object. R2 (like S3) reports success for a missing key, so check first
 * to keep the "did we delete anything" answer honest for callers.
 *
 * @returns {Promise<boolean>}
 */
export async function deleteObject(ref) {
  if (!isR2StorageConfigured()) return false;
  const found = await findObject(ref);
  if (!found) return false;

  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: found.key }));
    return true;
  } catch (err) {
    console.error(`[r2-storage] Delete failed for ${found.key}:`, err.message);
    return false;
  }
}

/**
 * List every object in the bucket. Used by the storage audit.
 *
 * @returns {Promise<Array<{ key: string, size: number, lastModified: string, url: string }>>}
 */
export async function listAllObjects() {
  if (!isR2StorageConfigured()) return [];

  const out = [];
  let ContinuationToken;
  do {
    const page = await getClient().send(
      new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken })
    );
    for (const obj of page.Contents || []) {
      out.push({
        key: obj.Key,
        size: Number(obj.Size || 0),
        lastModified: obj.LastModified ? new Date(obj.LastModified).toISOString() : null,
        url: publicUrlFor(obj.Key),
      });
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return out;
}

/** Confirm credentials and bucket work, for the admin settings page. */
export async function checkR2Storage() {
  if (!isR2StorageConfigured()) {
    return {
      connected: false,
      status: 'Unconfigured',
      message: 'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL to enable R2 storage.',
    };
  }

  try {
    await getClient().send(new HeadBucketCommand({ Bucket: BUCKET }));
    const objects = await listAllObjects();
    return {
      connected: true,
      status: 'Connected & Operational',
      bucket: BUCKET,
      publicUrl: PUBLIC_URL,
      assetCount: objects.length,
      totalBytes: objects.reduce((sum, o) => sum + o.size, 0),
      warning: null,
    };
  } catch (err) {
    return {
      connected: false,
      status: 'Connection Error',
      message: err.message,
    };
  }
}
