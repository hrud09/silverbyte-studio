/**
 * Storage-key rules shared by every upload path, so a file lands under the same name
 * whichever backend receives it.
 */

export const ALLOWED_FOLDERS = new Set(['builds', 'icon', 'feature', 'screenshot', 'promo', 'uploads', 'shares']);

/**
 * Decide the stored object name.
 *
 * The stored name is what a visitor's browser saves, so callers that can describe the
 * file — the release forms know the app slug and version — pass a `baseName` such as
 * `slug-v1-0`. That is unique at exactly the right granularity: one name per app
 * version, and re-uploading the same version overwrites it, which is the intended
 * behaviour when an admin replaces a build. Callers without that context send nothing
 * and keep a timestamped fallback rather than risk two builds colliding on one name.
 *
 * @param {string} originalName - the uploaded file's own name, for its extension
 * @param {string|null} baseName - caller-supplied, untrusted
 * @returns {string}
 */
export function buildStorageName(originalName, baseName) {
  const safeBase = String(baseName || '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);

  if (!safeBase) {
    return `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  }

  const ext = (originalName.match(/\.[a-zA-Z0-9]{1,10}$/) || [''])[0].toLowerCase();
  return `${safeBase}${ext}`;
}
