/**
 * Reusable client-side upload handler with real-time progress.
 *
 * The server decides how the bytes should travel and reports it as a mode:
 *   'stream' — POST straight to our streaming endpoint (GitHub Releases backend)
 *   'server' — multipart POST to /api/upload (local-disk development fallback)
 *
 * Every mode uses XMLHttpRequest rather than fetch, because fetch still cannot
 * report upload progress.
 */

/**
 * Fire an XHR upload and resolve when it completes, reporting progress along the way.
 *
 * @returns {Promise<XMLHttpRequest>}
 */
function xhrUpload({ method, url, body, headers = {}, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // Hold at 99 until the server confirms; the last byte sent is not the
          // same thing as the upload having been accepted.
          onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
        }
      };
    }

    xhr.onload = () => resolve(xhr);
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload was aborted'));
    xhr.send(body);
  });
}

/** Pull the clearest available error message out of a failed XHR. */
function describeFailure(xhr) {
  let parsed = null;
  try {
    parsed = JSON.parse(xhr.responseText);
  } catch {
    // Non-JSON response, usually an HTML error page from a proxy
  }
  if (parsed?.error) return parsed.error;
  if (xhr.status === 413) return 'File exceeds the server upload size limit.';
  if (xhr.status === 502 || xhr.status === 504) return 'Server timed out while processing the upload.';
  return `Upload failed (${xhr.status}): ${xhr.statusText || 'Unknown server error'}`;
}

/**
 * @param {Object} options
 * @param {File} options.file - The File object to upload
 * @param {string} [options.folder='uploads'] - Target category ('builds', 'icon', 'feature', 'screenshot')
 * @param {string} [options.baseName] - Human-readable stem for the stored file, e.g.
 *   'red-notes-v1-2'. Becomes the name a visitor's browser saves. Omit it when the
 *   caller can't describe the file uniquely; storage falls back to a timestamp.
 * @param {Function} [options.onProgress] - Callback receiving percent (0-100)
 * @returns {Promise<{ url: string, key?: string, fileName: string, size: number }>}
 */
export async function uploadFileWithProgress({ file, folder = 'uploads', baseName, onProgress }) {
  if (!file) throw new Error('No file selected for upload');

  const contentType =
    file.type ||
    (file.name.endsWith('.apk') ? 'application/vnd.android.package-archive' : 'application/octet-stream');

  let plan = null;
  try {
    const res = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, folder, contentType, fileSize: file.size, baseName }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) plan = json.data;
    }
  } catch (err) {
    console.warn('Could not determine upload mode, falling back to server upload:', err);
  }

  // Mode 1: stream through our server to GitHub Releases.
  if (plan?.mode === 'stream' && plan.streamUrl) {
    const xhr = await xhrUpload({
      method: 'POST',
      url: plan.streamUrl,
      body: file,
      headers: { 'Content-Type': contentType },
      onProgress,
    });

    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error(describeFailure(xhr));
    }

    const parsed = JSON.parse(xhr.responseText);
    if (!parsed.success) throw new Error(parsed.error || 'Upload failed');

    if (onProgress) onProgress(100);
    return {
      url: parsed.data.url,
      key: parsed.data.key,
      fileName: parsed.data.fileName || file.name,
      size: parsed.data.size || file.size,
    };
  }

  // Mode 2: multipart POST to our own route (local disk fallback).
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const xhr = await xhrUpload({ method: 'POST', url: '/api/upload', body: formData, onProgress });

  let parsed = null;
  try {
    parsed = JSON.parse(xhr.responseText);
  } catch {
    // Handled by describeFailure below
  }

  if (xhr.status < 200 || xhr.status >= 300 || !parsed?.success) {
    throw new Error(describeFailure(xhr));
  }

  if (onProgress) onProgress(100);
  return {
    url: parsed.data.url,
    key: parsed.data.key,
    fileName: parsed.data.fileName || file.name,
    size: parsed.data.size || file.size,
  };
}
