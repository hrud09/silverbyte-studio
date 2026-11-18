'use client';

import React, { useState } from 'react';
import { Download, Calendar, HardDrive, Smartphone, ChevronDown, ChevronUp, History } from 'lucide-react';
import { formatDate, formatFileSize } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import styles from './VersionHistoryList.module.css';

export default function VersionHistoryList({ versions = [], appSlug }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openChangelogs, setOpenChangelogs] = useState({});

  if (!versions || versions.length === 0) return null;

  const toggleChangelog = (id) => {
    setOpenChangelogs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const displayedVersions = isExpanded ? versions : versions.slice(0, 3);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <History size={20} className={styles.headerIcon} />
          <h3 className={styles.title}>Version History & Changelogs</h3>
        </div>
        <span className={styles.versionCount}>{versions.length} total releases</span>
      </div>

      <div className={styles.timeline}>
        {displayedVersions.map((v, idx) => {
          const isLatest = idx === 0;
          const isOpen = openChangelogs[v.id] || isLatest;

          return (
            <div key={v.id} className={`${styles.timelineItem} ${isLatest ? styles.latestItem : ''}`}>
              <div className={styles.markerCol}>
                <div className={`${styles.markerDot} ${isLatest ? styles.latestDot : ''}`} />
                {idx < displayedVersions.length - 1 && <div className={styles.markerLine} />}
              </div>

              <div className={styles.contentCol}>
                {/* Version Main Row */}
                <div className={styles.versionRow}>
                  <div className={styles.versionMeta}>
                    <span className={styles.versionName}>v{v.versionName}</span>
                    <span className={styles.buildCode}>Build {v.versionCode}</span>
                    {isLatest && (
                      <Badge variant="success" size="sm">
                        Latest
                      </Badge>
                    )}
                  </div>

                  <a
                    href={`/api/apps/${appSlug}/versions/${v.id}/download`}
                    className={styles.downloadBtn}
                    download={v.fileName || `${appSlug}-v${v.versionName}.apk`}
                    title={`Download APK v${v.versionName}`}
                  >
                    <Download size={13} />
                    <span>Download APK</span>
                  </a>
                </div>

                {/* Specs Sub-row */}
                <div className={styles.specsRow}>
                  <div className={styles.specItem}>
                    <Calendar size={13} />
                    <span>{formatDate(v.createdAt)}</span>
                  </div>
                  <div className={styles.specItem}>
                    <HardDrive size={13} />
                    <span>{v.filePath ? formatFileSize(v.fileSize) : '—'}</span>
                  </div>
                  <div className={styles.specItem}>
                    <Smartphone size={13} />
                    <span>{v.minOsVersion || 'Android 8.0+'}</span>
                  </div>
                </div>

                {/* Changelog Dropdown */}
                {v.changelog && (
                  <div className={styles.changelogSection}>
                    <button
                      type="button"
                      onClick={() => toggleChangelog(v.id)}
                      className={styles.changelogToggle}
                    >
                      <span>What changed</span>
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isOpen && <p className={styles.changelogText}>{v.changelog}</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / Collapse More Versions */}
      {versions.length > 3 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.expandBtn}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              <span>Show All ({versions.length}) Versions</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
