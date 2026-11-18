'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, FileCode, AlertCircle, AlertTriangle } from 'lucide-react';
import { useToast } from './ToastContext';
import { formatFileSize } from '@/lib/utils';
import { PLATFORMS, VERSION_STATUSES, MAX_FILE_SIZE, ALLOWED_PACKAGE_TYPES } from '@/lib/constants';
import { uploadFileWithProgress } from '@/lib/uploadClient';
import AssetDropzone from './AssetDropzone';
import styles from './ReleaseFormModal.module.css';

export default function ReleaseFormModal({
  isOpen = false,
  onClose = () => {},
  app = null, // { id, name, slug, versions }
  onSuccess = () => {},
  initialData = null, // if editing an existing version
}) {
  const { toast } = useToast();

  const [fetchedVersions, setFetchedVersions] = useState([]);

  useEffect(() => {
    if (!isOpen || !app?.id) return;
    if (app.versions && Array.isArray(app.versions) && app.versions.length > 0) {
      setFetchedVersions(app.versions);
    } else {
      fetch(`/api/versions?appId=${app.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.data)) {
            setFetchedVersions(data.data);
          }
        })
        .catch((err) => console.error('Failed to fetch previous releases:', err));
    }
  }, [isOpen, app]);

  const allVersions = useMemo(() => {
    return app?.versions?.length ? app.versions : fetchedVersions;
  }, [app, fetchedVersions]);

  const previousRelease = useMemo(() => {
    if (!allVersions || allVersions.length === 0) return null;
    if (initialData?.id) {
      const others = allVersions.filter((v) => v.id !== initialData.id);
      if (others.length === 0) return null;
      const earlier = others.filter((v) => (v.versionCode ?? 0) < (initialData.versionCode ?? Infinity));
      if (earlier.length > 0) {
        return [...earlier].sort((a, b) => (b.versionCode ?? 0) - (a.versionCode ?? 0))[0];
      }
      return [...others].sort((a, b) => (b.versionCode ?? 0) - (a.versionCode ?? 0))[0];
    }
    return [...allVersions].sort((a, b) => (b.versionCode ?? 0) - (a.versionCode ?? 0))[0] || null;
  }, [allVersions, initialData]);

  const [versionName, setVersionName] = useState(initialData?.versionName || '');
  const [versionCode, setVersionCode] = useState(
    initialData?.versionCode ?? (allVersions?.length ? Math.max(...allVersions.map((v) => v.versionCode || 0)) + 1 : 1)
  );
  const [changelog, setChangelog] = useState(initialData?.changelog || '');
  const [minOsVersion, setMinOsVersion] = useState(initialData?.minOsVersion || 'Android 8.0');
  const [platform, setPlatform] = useState(initialData?.platform || 'Android');
  const [status, setStatus] = useState(initialData?.status || 'PUBLISHED');

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(initialData?.fileName || '');
  const [uploadedFilePath, setUploadedFilePath] = useState(initialData?.filePath || '');
  const [fileSize, setFileSize] = useState(initialData?.fileSize || 0);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [needsFileConfirm, setNeedsFileConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVersionName(initialData?.versionName || '');
      const calcVersionCode =
        initialData?.versionCode ??
        (allVersions?.length ? Math.max(...allVersions.map((v) => v.versionCode || 0)) + 1 : 1);
      setVersionCode(calcVersionCode);
      setChangelog(initialData?.changelog || '');
      setMinOsVersion(initialData?.minOsVersion || previousRelease?.minOsVersion || 'Android 8.0');
      setPlatform(initialData?.platform || previousRelease?.platform || 'Android');
      setStatus(initialData?.status || 'PUBLISHED');
      setSelectedFile(null);
      setUploadedFileName(initialData?.fileName || '');
      setUploadedFilePath(initialData?.filePath || '');
      setFileSize(initialData?.fileSize || 0);
      setError('');
      setNeedsFileConfirm(false);
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isOpen, initialData, app, allVersions, previousRelease]);

  if (!isOpen) return null;

  const releaseStoredBuild = async (filePath) => {
    if (!filePath) return;
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: filePath }),
      });
    } catch (err) {
      console.warn('Could not delete replaced build file:', err.message);
    }
  };

  const handleFileSelect = async (files) => {
    const file = files?.[0];
    if (!file) return;

    const previousFilePath = uploadedFilePath;

    setSelectedFile(file);
    setFileSize(file.size);
    setUploadedFileName(file.name);
    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadFileWithProgress({
        file,
        folder: 'builds',
        // Names the file the visitor ends up saving. Only sent once both halves are
        // known -- a blank version would make every release of this app collide on
        // one name, so an unfilled form falls back to timestamped storage instead.
        baseName: app?.slug && versionName.trim() ? `${app.slug}-v${versionName.trim()}` : undefined,
        onProgress: (percent) => setUploadProgress(percent),
      });

      setUploadedFilePath(result.url);
      toast.success(`Uploaded ${file.name} successfully`, 'Build Uploaded');
      // If this replaced a file already uploaded in this session, don't leave it orphaned.
      if (previousFilePath && previousFilePath !== result.url) {
        releaseStoredBuild(previousFilePath);
      }
    } catch (err) {
      console.error('File upload error:', err);
      setError(err.message || 'File upload failed');
      toast.error(err.message || 'Failed to upload file');
      setUploadedFileName(previousFilePath ? uploadedFileName : '');
      setFileSize(previousFilePath ? fileSize : 0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    releaseStoredBuild(uploadedFilePath);
    setSelectedFile(null);
    setUploadedFileName('');
    setUploadedFilePath('');
    setFileSize(0);
  };

  const hasRealFile = Boolean(uploadedFilePath);

  const handleSubmit = async (e, skipFileWarning = false) => {
    if (e) e.preventDefault();
    setError('');

    if (!versionName.trim()) {
      setError('Version Name is required (e.g., 1.0.0)');
      return;
    }

    if (versionCode === '' || isNaN(Number(versionCode))) {
      setError('A valid integer Version Code is required (e.g., 1)');
      return;
    }

    if (!app?.id && !initialData?.appId) {
      setError('App context missing');
      return;
    }

    // Publishing with no real build file would silently hand users a placeholder
    // instead of the app — surface that clearly and require an explicit second step
    // rather than letting it happen unnoticed.
    if (status === 'PUBLISHED' && !hasRealFile && !skipFileWarning) {
      setNeedsFileConfirm(true);
      return;
    }
    setNeedsFileConfirm(false);

    setIsSubmitting(true);

    try {
      const payload = {
        appId: app?.id || initialData?.appId,
        versionName: versionName.trim(),
        versionCode: parseInt(versionCode, 10),
        changelog: changelog.trim(),
        minOsVersion: minOsVersion.trim(),
        platform,
        status,
        fileName: uploadedFileName || null,
        filePath: uploadedFilePath || null,
        fileSize: fileSize || 0,
      };

      const url = initialData?.id ? `/api/versions/${initialData.id}` : '/api/versions';
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // response was not JSON
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to save release (${res.status})`);
      }

      toast.success(
        initialData?.id
          ? `Release v${versionName} updated successfully`
          : `Release v${versionName} published successfully!`
      );
      onSuccess(data.data);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error saving release');
      toast.error(err.message || 'Failed to save release');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{initialData?.id ? 'Edit Release' : 'Create New Release'}</h3>
            {app && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Target App: {app.name}</span>}
          </div>
          <button type="button" className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {needsFileConfirm && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-warning-bg)',
                  color: 'var(--color-warning)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    No build file is attached. Publishing now will let users see this release and
                    tap Download, but they&apos;ll receive a clearly-labeled sample package instead
                    of your app until you upload a real build.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setNeedsFileConfirm(false)}
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={(e) => handleSubmit(e, true)}
                  >
                    Publish Anyway
                  </button>
                </div>
              </div>
            )}

            {/* Build File Upload Zone */}
            <div className="input-group">
              <div className={styles.fieldHeader}>
                <label className="input-label">App Package / Binary (APK, AAB, ZIP)</label>
                {previousRelease && (
                  <span
                    className={styles.prevHint}
                    title={
                      previousRelease.fileName
                        ? `Previous build: ${previousRelease.fileName}${previousRelease.fileSize ? ` (${formatFileSize(previousRelease.fileSize)})` : ''}`
                        : 'Previous: No build attached'
                    }
                  >
                    <span className={styles.prevBadge}>Prev</span>
                    <span className={styles.prevValue}>
                      {previousRelease.fileName
                        ? `${previousRelease.fileName}${previousRelease.fileSize ? ` (${formatFileSize(previousRelease.fileSize)})` : ''}`
                        : 'None'}
                    </span>
                  </span>
                )}
              </div>

              {!uploadedFileName ? (
                <AssetDropzone
                  accept={ALLOWED_PACKAGE_TYPES.join(',')}
                  uploading={isUploading}
                  progress={uploadProgress}
                  maxSizeBytes={MAX_FILE_SIZE}
                  allowedTypes={ALLOWED_PACKAGE_TYPES}
                  onFiles={handleFileSelect}
                  onValidationError={(msg) => toast.error(msg)}
                  className="file-upload-zone"
                >
                  <span className="file-upload-zone-icon" style={{ display: 'inline-flex' }}>
                    <FileCode size={32} />
                  </span>
                  <div className="file-upload-zone-text">
                    <strong>Click to upload APK / AAB build</strong> or drag and drop
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    Supports {ALLOWED_PACKAGE_TYPES.join(', ')} (up to {formatFileSize(MAX_FILE_SIZE)})
                  </span>
                </AssetDropzone>
              ) : (
                <div>
                  <div className={styles.filePreviewCard}>
                    <div className={styles.fileInfo}>
                      <FileCode size={24} color="var(--color-primary)" />
                      <div>
                        <div className={styles.fileName}>{uploadedFileName}</div>
                        <div className={styles.fileMeta}>{formatFileSize(fileSize)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.removeFileBtn}
                      onClick={handleRemoveFile}
                      title="Remove build file"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {isUploading && (
                    <div className={styles.uploadProgressWrapper}>
                      <div className={styles.progressBarTrack}>
                        <div className={styles.progressBarFill} style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                        <span>Uploading build file...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Form Fields Grid */}
            <div className={styles.formGrid}>
              <div className="input-group">
                <div className={styles.fieldHeader}>
                  <label className="input-label">
                    Version Name <span className="required">*</span>
                  </label>
                  {previousRelease && (
                    <span className={styles.prevHint} title={`Previous: ${previousRelease.versionName || '—'}`}>
                      <span className={styles.prevBadge}>Prev</span>
                      <span className={styles.prevValue}>{previousRelease.versionName || '—'}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. 1.2.0"
                  className="input"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <div className={styles.fieldHeader}>
                  <label className="input-label">
                    Version Code <span className="required">*</span>
                  </label>
                  {previousRelease && (
                    <span className={styles.prevHint} title={`Previous: ${previousRelease.versionCode ?? '—'}`}>
                      <span className={styles.prevBadge}>Prev</span>
                      <span className={styles.prevValue}>{previousRelease.versionCode ?? '—'}</span>
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  className="input"
                  value={versionCode}
                  onChange={(e) => setVersionCode(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <div className={styles.fieldHeader}>
                  <label className="input-label">Target Platform</label>
                  {previousRelease && (
                    <span className={styles.prevHint} title={`Previous: ${previousRelease.platform || '—'}`}>
                      <span className={styles.prevBadge}>Prev</span>
                      <span className={styles.prevValue}>{previousRelease.platform || '—'}</span>
                    </span>
                  )}
                </div>
                <select className="select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <div className={styles.fieldHeader}>
                  <label className="input-label">Minimum OS Version</label>
                  {previousRelease && (
                    <span className={styles.prevHint} title={`Previous: ${previousRelease.minOsVersion || '—'}`}>
                      <span className={styles.prevBadge}>Prev</span>
                      <span className={styles.prevValue}>{previousRelease.minOsVersion || '—'}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Android 8.0"
                  className="input"
                  value={minOsVersion}
                  onChange={(e) => setMinOsVersion(e.target.value)}
                />
              </div>

              <div className="input-group">
                <div className={styles.fieldHeader}>
                  <label className="input-label">Release Status</label>
                  {previousRelease && (
                    <span className={styles.prevHint} title={`Previous: ${previousRelease.status || '—'}`}>
                      <span className={styles.prevBadge}>Prev</span>
                      <span className={styles.prevValue}>{previousRelease.status || '—'}</span>
                    </span>
                  )}
                </div>
                <select
                  className="select"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setNeedsFileConfirm(false);
                  }}
                >
                  {Object.keys(VERSION_STATUSES).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`input-group ${styles.fullWidth}`}>
                <div className={styles.fieldHeader}>
                  <label className="input-label">Changelog / Release Notes</label>
                  {previousRelease && (
                    <span
                      className={styles.prevHint}
                      title={previousRelease.changelog ? `Previous: ${previousRelease.changelog}` : 'No previous changelog'}
                    >
                      <span className={styles.prevBadge}>Prev</span>
                      <span className={styles.prevValue}>
                        {previousRelease.changelog
                          ? previousRelease.changelog.length > 35
                            ? `${previousRelease.changelog.slice(0, 35)}…`
                            : previousRelease.changelog
                          : 'None'}
                      </span>
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  placeholder="What's new in this release? (features, bug fixes, performance improvements)"
                  className="textarea"
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || isUploading}>
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialData?.id ? 'Update Release' : 'Publish Release'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
