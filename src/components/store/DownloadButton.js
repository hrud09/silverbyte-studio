'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, Check, Loader2, AlertCircle } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import styles from './DownloadButton.module.css';

// One shared frame for every download button on the page.
const DOWNLOAD_FRAME_ID = 'red-apps-download-frame';

/**
 * Hand a large build to the browser's own download manager.
 *
 * The route answers with a 302 to storage, and for GitHub Releases that redirect is
 * cross-origin. `download` on an anchor is same-origin only, so it is discarded at
 * the redirect and what remains is a top-level navigation: the browser leaves the
 * store and finishes the transfer sitting on github.com. Navigating a hidden frame
 * instead means the storage host's Content-Disposition still fires while the user
 * stays here.
 */
function handOffToBrowser(url) {
  let frame = document.getElementById(DOWNLOAD_FRAME_ID);
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = DOWNLOAD_FRAME_ID;
    frame.style.display = 'none';
    document.body.appendChild(frame);
  }
  // Reused across clicks and left mounted: removing it mid-transfer aborts the
  // download in Chrome.
  frame.src = url;
}

/**
 * Label the button with the version, without stuttering into "vv0.1".
 * Admins type the version freely, and some already include the leading "v".
 */
function formatVersionLabel(versionName) {
  const trimmed = String(versionName || '').trim();
  if (!trimmed) return 'APK';
  return /^v/i.test(trimmed) ? trimmed : `v${trimmed}`;
}

/** Save an already-downloaded blob under a chosen name. */
function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  // Same-origin blob: URL, so `download` is honoured and we control the filename.
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can cancel the save in Safari; one turn of the loop is enough.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

export default function DownloadButton({
  appSlug,
  appName = 'App',
  latestVersion = null,
  className = '',
}) {
  // 'idle' | 'preparing' | 'downloading' | 'handoff' | 'success' | 'error'
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const xhrRef = useRef(null);
  const timersRef = useRef([]);

  // An in-flight transfer holds a socket and a growing buffer; both have to go if
  // the page navigates away mid-download.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      xhrRef.current?.abort();
      timers.forEach(clearTimeout);
    };
  }, []);

  const later = (fn, ms) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const resetSoon = (ms) => {
    later(() => {
      setStatus('idle');
      setProgress(0);
      setLoadedBytes(0);
      setTotalBytes(0);
      setErrorMessage('');
    }, ms);
  };

  const fail = (message) => {
    setStatus('error');
    setErrorMessage(message);
    resetSoon(8000);
  };

  /**
   * Pull the build through our own origin so progress is observable, resolving to
   * the finished blob. Only called for builds the preflight marked trackable.
   */
  const downloadWithProgress = (url, expectedTotal) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (e) => {
        // Content-Length is set from storage metadata, so lengthComputable holds
        // even when the CDN itself answers with chunked encoding.
        const total = e.lengthComputable ? e.total : expectedTotal;
        if (!total) return;
        setLoadedBytes(e.loaded);
        setTotalBytes(total);
        // Held below 100 until the response is actually accepted; the last byte
        // arriving is not the same as the file being ready to save.
        setProgress(Math.min(99, Math.round((e.loaded / total) * 100)));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
        else reject(new Error(`Download failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('Network error during download'));
      xhr.onabort = () => reject(new Error('Download cancelled'));
      xhr.send();
    });

  const handleDownload = async (e) => {
    e.preventDefault();
    if (status === 'preparing' || status === 'downloading') return;

    setStatus('preparing');
    setErrorMessage('');
    setProgress(0);
    setLoadedBytes(0);
    setTotalBytes(0);

    const downloadUrl = `/api/apps/${encodeURIComponent(appSlug)}/download`;

    try {
      // Ask first, then decide how to fetch. This also lets a missing build surface
      // as a real message instead of navigating into a JSON error page.
      const res = await fetch(`${downloadUrl}?check=1`);
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || `Download failed (${res.status})`);
      }

      const info = payload.data || {};
      const fileName = info.fileName || latestVersion?.fileName || `${appSlug}.apk`;

      // Large builds skip the proxy entirely: streaming them through the server
      // would cost egress we don't need to spend, and holding one in a phone's
      // memory to save it is how a tab gets killed.
      if (!info.trackable) {
        setStatus('handoff');
        handOffToBrowser(downloadUrl);
        later(() => setStatus('success'), 1200);
        resetSoon(4500);
        return;
      }

      setStatus('downloading');
      setTotalBytes(info.fileSize || 0);

      const blob = await downloadWithProgress(`${downloadUrl}?proxy=1`, info.fileSize || 0);

      setProgress(100);
      saveBlob(blob, fileName);
      setStatus('success');
      resetSoon(4000);
    } catch (err) {
      if (err.message === 'Download cancelled') return;
      console.error('Download failed:', err);
      fail(err.message || 'Could not download. Please try again.');
    } finally {
      xhrRef.current = null;
    }
  };

  const isBusy = status === 'preparing' || status === 'downloading' || status === 'handoff';

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        onClick={handleDownload}
        className={[
          styles.downloadButton,
          status === 'downloading' ? styles.downloading : '',
          status === 'success' ? styles.success : '',
          status === 'error' ? styles.error : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={isBusy}
        aria-label={`Download ${appName}`}
        aria-busy={isBusy}
        role={status === 'downloading' ? 'progressbar' : undefined}
        aria-valuenow={status === 'downloading' ? progress : undefined}
        aria-valuemin={status === 'downloading' ? 0 : undefined}
        aria-valuemax={status === 'downloading' ? 100 : undefined}
      >
        {/* Liquid fill tracking real bytes received. Sits behind the label. */}
        {status === 'downloading' && (
          <span className={styles.fill} style={{ width: `${progress}%` }} aria-hidden="true">
            <span className={styles.fillShine} />
          </span>
        )}

        <span className={styles.label}>
          {status === 'preparing' && (
            <>
              <Loader2 size={18} className={styles.spinner} />
              <span>Preparing...</span>
            </>
          )}

          {status === 'downloading' && (
            <>
              <Download size={18} className={styles.bounceIcon} />
              <span className={styles.percent}>{progress}%</span>
            </>
          )}

          {status === 'handoff' && (
            <>
              <Download size={18} className={styles.bounceIcon} />
              <span>Starting Download...</span>
            </>
          )}

          {status === 'success' && (
            <>
              <Check size={18} className={styles.checkIcon} />
              <span>Downloaded!</span>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle size={18} />
              <span>Retry Download</span>
            </>
          )}

          {status === 'idle' && (
            <>
              <Download size={18} className={styles.downloadIcon} />
              <span>Download {formatVersionLabel(latestVersion?.versionName)}</span>
            </>
          )}
        </span>
      </button>

      {status === 'downloading' && totalBytes > 0 && (
        <span className={styles.byteCount}>
          {formatFileSize(loadedBytes)} of {formatFileSize(totalBytes)}
        </span>
      )}

      {errorMessage && <span className={styles.errorText}>{errorMessage}</span>}
    </div>
  );
}
