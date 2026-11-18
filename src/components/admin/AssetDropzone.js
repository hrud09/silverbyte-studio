'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import styles from './AssetDropzone.module.css';

/**
 * Shared drag-and-drop + click-to-browse file picker used for icon, feature graphic,
 * screenshot, and build-file uploads. Owns real drag/drop handling and client-side
 * validation (size/type); upload + preview rendering stays with the caller since that
 * differs meaningfully between a single overwritable image and an appendable gallery.
 */
export default function AssetDropzone({
  accept,
  multiple = false,
  disabled = false,
  uploading = false,
  progress = 0,
  maxSizeBytes,
  allowedTypes, // array of extensions ('.apk') and/or MIME types ('image/png')
  onFiles,
  onValidationError = () => {},
  hint,
  compact = false,
  children,
  className = '',
  style,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const busy = disabled || uploading;

  const validate = (fileList) => {
    const files = Array.from(fileList || []);
    const valid = [];
    for (const file of files) {
      if (maxSizeBytes && file.size > maxSizeBytes) {
        onValidationError(`"${file.name}" is too large — max size is ${formatFileSize(maxSizeBytes)}.`);
        continue;
      }
      if (allowedTypes && allowedTypes.length > 0) {
        const nameLower = file.name.toLowerCase();
        const matches = allowedTypes.some((t) =>
          t.startsWith('.') ? nameLower.endsWith(t.toLowerCase()) : file.type === t
        );
        if (!matches) {
          onValidationError(`"${file.name}" isn't an accepted file type.`);
          continue;
        }
      }
      valid.push(file);
      if (!multiple) break;
    }
    return valid;
  };

  const handleFiles = (fileList) => {
    if (busy) return;
    const valid = validate(fileList);
    if (valid.length > 0) onFiles(valid);
  };

  return (
    <div
      className={`${styles.zone} ${isDragging ? styles.dragging : ''} ${compact ? styles.compact : ''} ${busy ? styles.busy : ''} ${className}`}
      style={style}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!busy && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!busy) setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!busy) handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {children || (
        <>
          <UploadCloud size={compact ? 22 : 32} className={styles.icon} />
          <div className={styles.text}>
            <strong>Click to upload</strong> or drag and drop
          </div>
          {hint && <span className={styles.hint}>{hint}</span>}
        </>
      )}

      {uploading && (
        <div className={styles.uploadOverlay}>
          <div className={styles.uploadOverlaySpinner} />
          {progress > 0 && <span className={styles.uploadOverlayText}>{progress}%</span>}
        </div>
      )}
    </div>
  );
}
