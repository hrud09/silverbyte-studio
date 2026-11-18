'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Link2,
  FileCode,
  AlertCircle,
  Share2,
  Copy,
  Check,
  Mail,
  Send,
  Lock,
  Globe,
  Download,
  ExternalLink,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useToast } from './ToastContext';
import { formatFileSize, formatRelativeTime, formatDateTime } from '@/lib/utils';
import { MAX_FILE_SIZE, ALLOWED_PACKAGE_TYPES } from '@/lib/constants';
import { uploadFileWithProgress } from '@/lib/uploadClient';
import QrCode from '@/components/ui/QrCode';
import AssetDropzone from './AssetDropzone';
import styles from './QuickShareModal.module.css';
import releaseStyles from './ReleaseFormModal.module.css';

/**
 * Quick Share — hand someone a build without publishing an app.
 *
 * Two steps, deliberately: compose (title + APK + visibility + expiration), then share
 * (link, QR, email). The link cannot exist before the file is stored, and splitting the modal on
 * that boundary means the share step never shows a link that isn't yet downloadable.
 */

/**
 * Random stem for the stored object, generated here rather than derived from the title.
 *
 * Builds live in a public GitHub repository, so a storage name built from the title
 * would announce what is being shared to anyone who stumbled on the release. This is a
 * filename, not a credential — the share token is minted server-side and is unrelated
 * to it, so knowing one tells you nothing about the other.
 */
function randomStorageStem() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function QuickShareModal({ isOpen = false, onClose = () => {}, onSuccess = () => {} }) {
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [expiresOption, setExpiresOption] = useState('24h');
  const [customDuration, setCustomDuration] = useState('12');
  const [customUnit, setCustomUnit] = useState('hours');

  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Populated once the share exists; its presence is what switches the modal to step 2.
  const [share, setShare] = useState(null);

  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const qrWrapRef = useRef(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setTitle('');
    setIsPrivate(true);
    setExpiresOption('24h');
    setCustomDuration('12');
    setCustomUnit('hours');
    setFileName('');
    setFileUrl('');
    setFileSize(0);
    setProgress(0);
    setError('');
    setShare(null);
    setCopied(false);
    setEmail('');
    setNote('');
    setSentTo('');
  };

  const closeAndReset = () => {
    resetAll();
    onClose();
  };

  const handleFileSelect = async (files) => {
    const file = files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const result = await uploadFileWithProgress({
        file,
        folder: 'shares',
        baseName: randomStorageStem(),
        onProgress: setProgress,
      });
      setFileUrl(result.url);
    } catch (err) {
      console.error('Share upload error:', err);
      toast.error(err.message || 'Upload failed');
      setFileName('');
      setFileSize(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('A title is required');
      return;
    }
    if (!fileUrl) {
      setError('Please upload a file to share');
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresIn =
        expiresOption === 'custom'
          ? `${Math.max(1, Number(customDuration) || 1)}${customUnit === 'hours' ? 'h' : 'd'}`
          : expiresOption;

      const res = await fetch('/api/admin/quick-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          fileUrl,
          fileName,
          fileSize,
          isPrivate,
          expiresIn,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to create share (${res.status})`);
      }

      setShare(data.data);
      onSuccess(data.data);

      // Automatically copy the newly generated link to the clipboard immediately
      if (data.data?.url && typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.data.url);
          setCopied(true);
          toast.success('Share link generated and copied to clipboard!');
          setTimeout(() => setCopied(false), 2500);
        } catch {
          toast.success('Share link generated!');
        }
      } else {
        toast.success('Share link generated!');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not create the share link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access is refused in some browsers/contexts; the link is on screen
      // and selectable, so say so rather than failing silently.
      toast.warning('Could not copy automatically — select the link and copy it.');
    }
  };

  /** Rasterise the inline QR so it can be pasted into a doc or printed for a test bench. */
  const saveQrPng = () => {
    const svg = qrWrapRef.current?.querySelector('svg');
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const scale = 4; // the on-screen SVG is ~180px; print wants more than that
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${share.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'share'}-qr.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => toast.error('Could not render the QR code as an image');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  };

  /** Hand the message to the operator's own mail client — the no-provider fallback. */
  const openMailClient = () => {
    const body = [
      note.trim(),
      note.trim() ? '' : null,
      `${share.title}${share.fileSize ? ` (${formatFileSize(share.fileSize)})` : ''}`,
      share.url,
    ]
      .filter((line) => line !== null)
      .join('\n');

    window.location.href =
      `mailto:${encodeURIComponent(email.trim())}` +
      `?subject=${encodeURIComponent(`${share.title} — download link`)}` +
      `&body=${encodeURIComponent(body)}`;
  };

  const sendEmail = async () => {
    if (!email.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/admin/quick-share/${share.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email.trim(), note: note.trim() }),
      });

      const data = await res.json().catch(() => null);

      // 503 with configured:false means mail was never set up — not a failure the
      // operator can act on right now, so hand them their own mail client instead.
      if (res.status === 503 && data?.configured === false) {
        toast.info('Server email is not configured — opening your mail app instead.');
        openMailClient();
        return;
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Could not send the email (${res.status})`);
      }

      setSentTo(email.trim());
      setEmail('');
      setNote('');
      toast.success(`Link sent to ${data.data.to}`);
      onSuccess(share);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not send the email');
    } finally {
      setSending(false);
    }
  };

  const busy = isSubmitting || uploading;

  return (
    <div className="modal-backdrop" onClick={closeAndReset}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={18} />
              <span>{share ? 'Ready to share' : 'Quick Share'}</span>
            </h3>
            <span className={styles.subtitle}>
              {share
                ? 'Send this link, scan the code, or email it straight from here.'
                : 'A title and a file. No listing, no version, no store page.'}
            </span>
          </div>
          <button type="button" className="btn-icon btn-ghost" onClick={closeAndReset} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!share ? (
          <form onSubmit={handleCreate}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {error && (
                <div className={styles.errorBanner}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="input-group">
                <label className="input-label" htmlFor="share-title">
                  Title <span className="required">*</span>
                </label>
                <input
                  id="share-title"
                  type="text"
                  className="input"
                  placeholder="e.g. Red Notes — beta 4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  required
                />
                <span className="input-hint">What the recipient sees, and what the file is named on their device.</span>
              </div>

              <div className="input-group">
                <label className="input-label">
                  File <span className="required">*</span>
                </label>
                {!fileName ? (
                  <AssetDropzone
                    accept={ALLOWED_PACKAGE_TYPES.join(',')}
                    uploading={uploading}
                    progress={progress}
                    maxSizeBytes={MAX_FILE_SIZE}
                    allowedTypes={ALLOWED_PACKAGE_TYPES}
                    onFiles={handleFileSelect}
                    onValidationError={(msg) => toast.error(msg)}
                    className="file-upload-zone"
                  >
                    <span className="file-upload-zone-icon" style={{ display: 'inline-flex' }}>
                      <FileCode size={26} />
                    </span>
                    <div className="file-upload-zone-text">
                      <strong>Click to upload an APK</strong> or drag and drop
                    </div>
                    <span className={styles.hintText}>Up to {formatFileSize(MAX_FILE_SIZE)}</span>
                  </AssetDropzone>
                ) : (
                  <div className={releaseStyles.filePreviewCard} style={{ position: 'relative', overflow: 'hidden' }}>
                    {uploading && <div className={styles.progressFill} style={{ width: `${progress}%` }} />}
                    <div className={releaseStyles.fileInfo} style={{ position: 'relative', zIndex: 1 }}>
                      <FileCode size={24} color="var(--color-primary)" />
                      <div>
                        <div className={releaseStyles.fileName}>{fileName}</div>
                        <div className={releaseStyles.fileMeta}>
                          {uploading ? `Uploading… ${Math.round(progress)}%` : formatFileSize(fileSize)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={releaseStyles.removeFileBtn}
                      onClick={() => {
                        setFileName('');
                        setFileUrl('');
                        setFileSize(0);
                      }}
                      title="Remove file"
                      disabled={uploading}
                      style={{ position: 'relative', zIndex: 1, opacity: uploading ? 0.5 : 1 }}
                    >
                      {uploading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <X size={16} />}
                    </button>
                  </div>
                )}
              </div>

              <div className="input-group">
                <span className="input-label">Visibility</span>
                <div className={styles.visibilityGroup}>
                  <button
                    type="button"
                    className={`${styles.visibilityOption} ${isPrivate ? styles.selected : ''}`}
                    onClick={() => setIsPrivate(true)}
                    aria-pressed={isPrivate}
                  >
                    <Lock size={16} />
                    <span className={styles.visibilityTitle}>Private</span>
                    <span className={styles.visibilityDesc}>
                      Anyone with the link. Hidden from search engines, and downloads are served
                      through this site so the storage URL is never exposed.
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.visibilityOption} ${!isPrivate ? styles.selected : ''}`}
                    onClick={() => setIsPrivate(false)}
                    aria-pressed={!isPrivate}
                  >
                    <Globe size={16} />
                    <span className={styles.visibilityTitle}>Public</span>
                    <span className={styles.visibilityDesc}>
                      Same link, but indexable and redirected straight to storage for the fastest
                      download. Still not listed in the store.
                    </span>
                  </button>
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="input-label" style={{ marginBottom: 0 }}>
                    Auto-Delete / Expiration
                  </span>
                  <span className={styles.hintText}>Deletes link and storage file</span>
                </div>
                <div className={styles.expiryChipGroup}>
                  {[
                    { value: '1h', label: '1 Hour' },
                    { value: '24h', label: '24 Hours (1 Day)' },
                    { value: '3d', label: '3 Days' },
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' },
                    { value: 'never', label: 'Never' },
                    { value: 'custom', label: 'Custom...' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.expiryChip} ${expiresOption === opt.value ? styles.selected : ''}`}
                      onClick={() => setExpiresOption(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {expiresOption === 'custom' && (
                  <div className={styles.customExpiryRow}>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className={`input ${styles.customExpiryInput}`}
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                    />
                    <select
                      className={`input ${styles.customExpirySelect}`}
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                    <span className={styles.hintText}>after creation</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeAndReset} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {isSubmitting ? (
                  <>
                    <span className="spinner" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <Link2 size={15} />
                    <span>Create link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className={styles.shareSummary}>
                <div className={styles.shareTitle}>{share.title}</div>
                <div className={styles.shareMeta}>
                  <span className={`badge ${share.isPrivate ? 'badge-neutral' : 'badge-info'}`}>
                    {share.isPrivate ? 'Private' : 'Public'}
                  </span>
                  {share.fileSize > 0 && <span>{formatFileSize(share.fileSize)}</span>}
                  {share.expiresAt ? (
                    <span
                      className={styles.expiryMetaTag}
                      title={`Expires on ${formatDateTime(share.expiresAt)}`}
                    >
                      <Clock size={13} />
                      <span>Auto-deletes {formatRelativeTime(share.expiresAt)}</span>
                    </span>
                  ) : (
                    <span
                      className={styles.expiryMetaTag}
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      <Clock size={13} />
                      <span>No expiration</span>
                    </span>
                  )}
                </div>
              </div>

              {share.urlScope !== 'public' && (
                /* Caught here as well as on the share list, because this is the moment
                   the operator is about to copy the link and send it to someone. */
                <div className={styles.errorBanner} style={{ alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    This link points at{' '}
                    {share.urlScope === 'lan' ? 'a private network address' : 'this computer'}, so
                    only {share.urlScope === 'lan' ? 'devices on this Wi-Fi' : 'this machine'} can
                    open it. Set the public address of your store on the Quick Share page, then copy
                    the link again.
                  </span>
                </div>
              )}

              <div className={styles.linkRow}>
                {/* Rendered as text, not just a button: the operator needs to see and
                    verify the URL they are about to send to someone. */}
                <a
                  href={share.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkText}
                  title="Open the share page"
                >
                  {share.url}
                </a>
                <button
                  type="button"
                  className={`btn btn-sm ${copied ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={copyLink}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className={styles.qrRow}>
                <div className={styles.qrFrame} ref={qrWrapRef}>
                  <QrCode value={share.url} size={168} title={`QR code for ${share.title}`} />
                </div>
                <div className={styles.qrSide}>
                  <p className={styles.qrHeading}>Scan to download</p>
                  <p className={styles.qrBody}>
                    Point a phone camera at this code to open the download page — handy for
                    getting a build onto a test device without typing anything.
                  </p>
                  <div className={styles.qrActions}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={saveQrPng}>
                      <Download size={14} />
                      <span>Save PNG</span>
                    </button>
                    <a
                      href={share.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      <ExternalLink size={14} />
                      <span>Preview</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className={styles.emailBlock}>
                <div className={styles.emailHeading}>
                  <Mail size={15} />
                  <span>Email the link</span>
                  <span className={styles.optionalTag}>optional</span>
                </div>

                {sentTo && (
                  <div className={styles.sentBanner}>
                    <Check size={14} />
                    <span>Sent to {sentTo}. Send it to someone else below if you like.</span>
                  </div>
                )}

                <div className={styles.emailFields}>
                  <input
                    type="email"
                    className="input"
                    placeholder="recipient@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendEmail();
                      }
                    }}
                  />
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="Add a short note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className={styles.emailActions}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={sendEmail}
                      disabled={sending || !email.trim()}
                    >
                      {sending ? (
                        <>
                          <span className="spinner" />
                          <span>Sending…</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={openMailClient}
                      disabled={!email.trim()}
                      title="Compose in your own mail app instead"
                    >
                      <Mail size={14} />
                      <span>Use my mail app</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={resetAll}>
                Share another
              </button>
              <button type="button" className="btn btn-primary" onClick={closeAndReset}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
