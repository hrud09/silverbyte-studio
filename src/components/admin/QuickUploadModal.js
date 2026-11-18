'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Image as ImageIcon, FileCode, AlertCircle, Zap } from 'lucide-react';
import { useToast } from './ToastContext';
import { formatFileSize, slugify } from '@/lib/utils';
import { MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE, ALLOWED_PACKAGE_TYPES } from '@/lib/constants';
import { uploadFileWithProgress } from '@/lib/uploadClient';
import AssetDropzone from './AssetDropzone';
import styles from './ReleaseFormModal.module.css';

/**
 * Fast-path app creation: name + icon + APK only. Everything else (slug, package ID,
 * short description, initial version) is generated server-side so a first listing can
 * go live in three fields — the full editor is still there afterward for anything more.
 */
export default function QuickUploadModal({ isOpen = false, onClose = () => {}, onSuccess = () => {} }) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [developerType, setDeveloperType] = useState('SILVER_BYTE'); // 'SILVER_BYTE' | 'OTHER'
  const [developerName, setDeveloperName] = useState('');
  const [appType, setAppType] = useState('NORMAL'); // 'NORMAL' | 'MOD'
  const [modDetails, setModDetails] = useState('');

  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [iconUploading, setIconUploading] = useState(false);
  const [iconProgress, setIconProgress] = useState(0);

  const [apkFileName, setApkFileName] = useState('');
  const [apkUrl, setApkUrl] = useState('');
  const [apkFileSize, setApkFileSize] = useState(0);
  const [apkUploading, setApkUploading] = useState(false);
  const [apkProgress, setApkProgress] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetAndClose = () => {
    setName('');
    setDeveloperType('SILVER_BYTE');
    setDeveloperName('');
    setAppType('NORMAL');
    setModDetails('');
    setIconFile(null);
    setIconPreview('');
    setIconUrl('');
    setApkFileName('');
    setApkUrl('');
    setApkFileSize(0);
    setError('');
    onClose();
  };

  const handleIconSelect = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
    setIconUploading(true);
    setIconProgress(0);
    setError('');

    try {
      const result = await uploadFileWithProgress({
        file,
        folder: 'icon',
        onProgress: (percent) => setIconProgress(percent),
      });
      setIconUrl(result.url);
    } catch (err) {
      console.error('Icon upload error:', err);
      toast.error(err.message || 'Icon upload failed');
      setIconPreview('');
      setIconFile(null);
    } finally {
      setIconUploading(false);
    }
  };

  const handleApkSelect = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setApkFileName(file.name);
    setApkFileSize(file.size);
    setApkUploading(true);
    setApkProgress(0);
    setError('');

    try {
      const result = await uploadFileWithProgress({
        file,
        folder: 'builds',
        // Quick upload always creates version 1.0 server-side, so the name is known
        // up front. Falls back to timestamped storage until the app has been named.
        baseName: name.trim() ? `${slugify(name)}-v1.0` : undefined,
        onProgress: (percent) => setApkProgress(percent),
      });
      setApkUrl(result.url);
    } catch (err) {
      console.error('APK upload error:', err);
      toast.error(err.message || 'APK upload failed');
      setApkFileName('');
      setApkFileSize(0);
    } finally {
      setApkUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('App name is required');
      return;
    }
    if (!iconUrl) {
      setError('Please upload an app icon');
      return;
    }
    if (!apkUrl) {
      setError('Please upload an APK file');
      return;
    }

    if (developerType === 'OTHER' && !developerName.trim()) {
      setError('Please enter the developer name');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/apps/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          developerType,
          developerName: developerType === 'OTHER' ? developerName.trim() : 'Silver Byte Studios',
          appType,
          modDetails: appType === 'MOD' ? modDetails.trim() : null,
          iconUrl,
          apkUrl,
          apkFileName,
          apkFileSize,
        }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // response was not JSON
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to create app (${res.status})`);
      }

      toast.success(`"${name.trim()}" is live! Add screenshots or a description any time.`);
      onSuccess(data.data);
      resetAndClose();
      router.push(`/admin/apps/${data.data.slug}/edit`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error creating app');
      toast.error(err.message || 'Error creating app');
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || iconUploading || apkUploading;

  return (
    <div className="modal-backdrop" onClick={resetAndClose}>
      <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} />
              <span>Quick Upload</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Name, developer, icon, and APK — publish now, polish later.
            </span>
          </div>
          <button type="button" className="btn-icon btn-ghost" onClick={resetAndClose} aria-label="Close">
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

            <div className="input-group">
              <label className="input-label">
                App Name <span className="required">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SB File Manager"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Quick Classification Selectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="input-label" style={{ margin: 0 }}>
                Developer Origin & App Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <select
                  className="select"
                  value={developerType}
                  onChange={(e) => setDeveloperType(e.target.value)}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <option value="SILVER_BYTE">From Silver Byte Studios</option>
                  <option value="OTHER">From Other Developers</option>
                </select>

                <select
                  className="select"
                  value={appType}
                  onChange={(e) => setAppType(e.target.value)}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <option value="NORMAL">Normal App</option>
                  <option value="MOD">Mod App (MOD)</option>
                </select>
              </div>

              {developerType === 'OTHER' && (
                <input
                  type="text"
                  placeholder="Enter Developer Name (e.g. Acme Devs)"
                  className="input"
                  style={{ fontSize: '0.8125rem', marginTop: 4 }}
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  required
                />
              )}

              {appType === 'MOD' && (
                <input
                  type="text"
                  placeholder="Mod Highlights (e.g. Premium Unlocked, No Ads)"
                  className="input"
                  style={{ fontSize: '0.8125rem', marginTop: 4 }}
                  value={modDetails}
                  onChange={(e) => setModDetails(e.target.value)}
                />
              )}
            </div>

            <div className="input-group">
              <label className="input-label">
                App Icon <span className="required">*</span>
              </label>
              <AssetDropzone
                accept="image/*"
                uploading={iconUploading}
                progress={iconProgress}
                maxSizeBytes={MAX_IMAGE_SIZE}
                allowedTypes={ALLOWED_IMAGE_TYPES}
                onFiles={handleIconSelect}
                onValidationError={(msg) => toast.error(msg)}
                style={{ height: 96 }}
              >
                {iconPreview ? (
                  <img
                    src={iconPreview}
                    alt="Icon preview"
                    style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }}
                  />
                ) : (
                  <>
                    <ImageIcon size={26} className="file-upload-zone-icon" />
                    <div className="file-upload-zone-text">
                      <strong>Click to upload</strong> or drag and drop
                    </div>
                  </>
                )}
              </AssetDropzone>
            </div>

            <div className="input-group">
              <label className="input-label">
                APK File <span className="required">*</span>
              </label>
              {!apkFileName ? (
                <AssetDropzone
                  accept={ALLOWED_PACKAGE_TYPES.join(',')}
                  uploading={apkUploading}
                  progress={apkProgress}
                  maxSizeBytes={MAX_FILE_SIZE}
                  allowedTypes={ALLOWED_PACKAGE_TYPES}
                  onFiles={handleApkSelect}
                  onValidationError={(msg) => toast.error(msg)}
                  className="file-upload-zone"
                >
                  <span className="file-upload-zone-icon" style={{ display: 'inline-flex' }}>
                    <FileCode size={26} />
                  </span>
                  <div className="file-upload-zone-text">
                    <strong>Click to upload APK</strong> or drag and drop
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    Up to {formatFileSize(MAX_FILE_SIZE)}
                  </span>
                </AssetDropzone>
              ) : (
                <div className={styles.filePreviewCard} style={{ position: 'relative', overflow: 'hidden' }}>
                  {apkUploading && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${apkProgress}%`,
                        backgroundColor: 'var(--color-primary)',
                        opacity: 0.1,
                        transition: 'width 0.2s ease-out',
                        zIndex: 0
                      }}
                    />
                  )}
                  <div className={styles.fileInfo} style={{ position: 'relative', zIndex: 1 }}>
                    <FileCode size={24} color="var(--color-primary)" />
                    <div>
                      <div className={styles.fileName}>{apkFileName}</div>
                      <div className={styles.fileMeta}>
                        {apkUploading ? `Uploading... ${Math.round(apkProgress)}%` : formatFileSize(apkFileSize)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.removeFileBtn}
                    onClick={() => {
                      setApkFileName('');
                      setApkUrl('');
                      setApkFileSize(0);
                    }}
                    title="Remove APK"
                    disabled={apkUploading}
                    style={{ position: 'relative', zIndex: 1, opacity: apkUploading ? 0.5 : 1 }}
                  >
                    {apkUploading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <X size={16} />}
                  </button>
                </div>
              )}
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
              We&apos;ll auto-generate a URL slug, package ID, and version (1.0) — edit any of
              it, plus screenshots and a full description, right after this is created.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={resetAndClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Publish App</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
