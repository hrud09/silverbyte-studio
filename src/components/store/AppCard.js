'use client';

import React from 'react';
import Link from 'next/link';
import { Download, Share2, Sparkles, FlaskConical, Zap, CheckCircle2 } from 'lucide-react';
import { formatFileSize, formatCompactNumber, getAppIconUrl } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import ShareModal from '@/components/store/ShareModal';
import styles from './AppCard.module.css';

export default function AppCard({ app, variant = 'standard' }) {
  if (!app) return null;

  const iconUrl = getAppIconUrl(app);
  const latestVersion = app.latestVersion || app.versions?.[0];
  const formattedSize = latestVersion?.fileSize ? formatFileSize(latestVersion.fileSize) : null;
  const isTesting = Boolean(app.isTesting || app.playStoreUrl || app.playStoreWebUrl);
  const isMod = app.appType === 'MOD';
  const isSilverByte = (app.developerType || 'SILVER_BYTE') === 'SILVER_BYTE';

  if (variant === 'compact') {
    return (
      <Link href={`/apps/${app.slug}`} className={styles.compactCard}>
        <div className={styles.compactIconWrapper}>
          <img
            src={iconUrl}
            alt={app.name}
            className={styles.compactIcon}
            onError={(e) => {
              e.currentTarget.src = `/api/placeholder/icon/${app.slug}`;
            }}
          />
          {isMod && (
            <span className={styles.compactModBadge} title="Mod App">
              <Zap size={9} />
            </span>
          )}
        </div>
        <div className={styles.compactMeta}>
          <div className={styles.compactTitleRow}>
            <h4 className={styles.compactTitle}>{app.name}</h4>
            {isMod && <span className={styles.modMiniTag}>MOD</span>}
          </div>
          <span className={styles.compactCategory}>
            {app.developerName || (isSilverByte ? 'Silver Byte Studios' : 'Other Developer')}
          </span>
          <div className={styles.compactStats}>
            <Download size={11} />
            <span className={styles.compactDownloads}>
              {formatCompactNumber(app.downloads || 0)} downloads
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.body}>
      <Link href={`/apps/${app.slug}`} className={styles.cardClickArea}>
        {/* App Icon */}
        <div className={styles.iconWrapper}>
          <img
            src={iconUrl}
            alt={app.name}
            className={styles.appIcon}
            onError={(e) => {
              e.currentTarget.src = `/api/placeholder/icon/${app.slug}`;
            }}
          />
          {isMod && (
            <span className={styles.modBadge} title="Mod App / Enhanced Build">
              <Zap size={11} />
              <span>MOD</span>
            </span>
          )}
          {app.featured && (
            <span className={styles.featuredBadge} title="Featured App">
              <Sparkles size={10} />
            </span>
          )}
          {isTesting && (
            <span className={styles.testingBadge} title={`Testing Track: ${app.testingTrack || 'Beta'}`}>
              <FlaskConical size={10} />
            </span>
          )}
        </div>

        {/* Info */}
        <div className={styles.info}>
          <h3 className={styles.appName} title={app.name}>
            {app.name}
          </h3>
          <p className={styles.developerName}>
            {app.developerName || (isSilverByte ? 'Silver Byte Studios' : 'Other Developer')}
            {isSilverByte && (
              <span className={styles.officialBadge} title="Official Silver Byte Release">
                <CheckCircle2 size={11} />
              </span>
            )}
          </p>

          <p className={styles.shortDesc}>{app.shortDescription}</p>

          <div className={styles.metaRow}>
            <div className={styles.categoryPills}>
              {app.category && (
                <Badge variant="neutral" size="sm">
                  {app.category.name}
                </Badge>
              )}
              {isMod && (
                <Badge variant="warning" size="sm">
                  MOD
                </Badge>
              )}
            </div>
            <span className={styles.downloadCount}>
              <Download size={11} />
              {formatCompactNumber(app.downloads || 0)}
            </span>
          </div>
        </div>
      </Link>

      {/* Footer / Quick Action */}
      <div className={styles.footer}>
        <div className={styles.versionInfo}>
          {latestVersion?.versionName ? (
            <span className={styles.versionText}>v{latestVersion.versionName}</span>
          ) : (
            <span className={styles.versionText}>No release yet</span>
          )}
          {formattedSize && <span className={styles.sizeText}>• {formattedSize}</span>}
        </div>

        <div className={styles.footerActions}>
          <ShareModal
            app={app}
            triggerButton={
              <button
                type="button"
                className={styles.quickShareCardBtn}
                title={`Quick Share ${app.name}`}
              >
                <Share2 size={14} />
              </button>
            }
          />
          <Link
            href={`/apps/${app.slug}`}
            className={`gx-btn gx-btn-red gx-btn-sm ${styles.downloadBtn}`}
            title="View & Install App"
          >
            <Download size={14} />
            <span>Get</span>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
