'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Info,
  Sparkles,
  ListChecks,
  Globe,
  LifeBuoy,
  FileText,
  ExternalLink,
  FlaskConical,
  Smartphone,
  Zap,
  CheckCircle2,
  Mail,
  UserCheck,
} from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import AboutAppText from './AboutAppText';
import { formatDate, formatFileSize } from '@/lib/utils';
import styles from './AppDetailTabs.module.css';

export default function AppDetailTabs({ app, latestVersion }) {
  const hasChangelog = Boolean(latestVersion?.changelog);
  const hasTesting = Boolean(app.isTesting || app.playStoreUrl || app.playStoreWebUrl || app.webAppUrl || app.testingInstructions);
  const isMod = app.appType === 'MOD';
  const isSilverByte = (app.developerType || 'SILVER_BYTE') === 'SILVER_BYTE';
  const hasModDetails = Boolean(app.modDetails);

  const tabDefs = [
    { id: 'about', label: 'About', icon: Info },
    ...(hasChangelog ? [{ id: 'whatsnew', label: "What's New", icon: Sparkles }] : []),
    ...(isMod && hasModDetails ? [{ id: 'mod', label: 'Mod Features', icon: Zap }] : []),
    { id: 'specs', label: 'Specifications', icon: ListChecks },
    ...(hasTesting ? [{ id: 'testing', label: 'Testing & Links', icon: FlaskConical }] : []),
    { id: 'developer', label: 'Developer', icon: Globe },
  ];

  const [activeTab, setActiveTab] = useState('about');
  const effectiveTab = tabDefs.some((t) => t.id === activeTab) ? activeTab : 'about';

  return (
    <div className={styles.container}>
      <Tabs tabs={tabDefs} activeTab={effectiveTab} onChange={setActiveTab} />

      <div className={styles.panel}>
        {effectiveTab === 'about' && (
          <AboutAppText shortDescription={app.shortDescription} fullDescription={app.fullDescription} />
        )}

        {effectiveTab === 'whatsnew' && hasChangelog && (
          <div>
            <div className={styles.whatsNewHeader}>
              <h3 className={styles.sectionHeading}>What&apos;s New in v{latestVersion.versionName}</h3>
              <span className={styles.whatsNewDate}>Updated on {formatDate(latestVersion.createdAt)}</span>
            </div>
            <p className={styles.whatsNewContent}>{latestVersion.changelog}</p>
          </div>
        )}

        {effectiveTab === 'mod' && hasModDetails && (
          <div className={styles.modTabContainer}>
            <div className={styles.modHeader}>
              <div className={styles.modIconPill}>
                <Zap size={18} />
                <span>Mod App Highlights</span>
              </div>
            </div>
            <div className={styles.modDetailsBox}>
              <p className={styles.modDetailsText}>{app.modDetails}</p>
            </div>
          </div>
        )}

        {effectiveTab === 'specs' && (
          <div className={styles.specGrid}>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>App Classification</span>
              <span className={styles.specValue}>
                {isMod ? '⚡ Mod App / Enhanced' : 'Standard App'}
              </span>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Developer Origin</span>
              <span className={styles.specValue}>
                {isSilverByte ? 'Silver Byte Studios Original' : 'Third-Party Developer'}
              </span>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Package ID</span>
              <span className={styles.specValue}>{app.packageId}</span>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Version</span>
              <span className={styles.specValue}>
                {latestVersion ? `${latestVersion.versionName} (${latestVersion.versionCode})` : '—'}
              </span>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Updated Date</span>
              <span className={styles.specValue}>
                {latestVersion?.createdAt || app.updatedAt ? formatDate(latestVersion?.createdAt || app.updatedAt) : '—'}
              </span>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>File Size</span>
              <span className={styles.specValue}>
                {latestVersion?.fileSize ? formatFileSize(latestVersion.fileSize) : '—'}
              </span>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Required OS</span>
              <span className={styles.specValue}>{latestVersion?.minOsVersion || '—'}</span>
            </div>
            <div className={styles.specBox}>
              <span className={styles.specLabel}>Platform</span>
              <span className={styles.specValue}>{latestVersion?.platform || '—'}</span>
            </div>
            {app.testingTrack && (
              <div className={styles.specBox}>
                <span className={styles.specLabel}>Testing Track</span>
                <span className={styles.specValue}>{app.testingTrack.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        )}

        {effectiveTab === 'testing' && hasTesting && (
          <div className={styles.devLinksGrid}>
            {app.playStoreUrl && (
              <a href={app.playStoreUrl} target="_blank" rel="noopener noreferrer" className={styles.devLinkItem}>
                <Smartphone size={18} />
                <span>Play Store (Android App)</span>
                <ExternalLink size={12} className={styles.extIcon} />
              </a>
            )}
            {app.playStoreWebUrl && (
              <a href={app.playStoreWebUrl} target="_blank" rel="noopener noreferrer" className={styles.devLinkItem}>
                <Globe size={18} />
                <span>Play Store (Web Opt-In)</span>
                <ExternalLink size={12} className={styles.extIcon} />
              </a>
            )}
            {app.webAppUrl && (
              <a href={app.webAppUrl} target="_blank" rel="noopener noreferrer" className={styles.devLinkItem}>
                <Globe size={18} />
                <span>Live Web App</span>
                <ExternalLink size={12} className={styles.extIcon} />
              </a>
            )}
            {app.testingInstructions && (
              <div style={{ width: '100%', marginTop: 'var(--space-2)', padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-text)', display: 'block', marginBottom: '6px' }}>
                  Tester Instructions:
                </strong>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-line' }}>
                  {app.testingInstructions}
                </p>
              </div>
            )}
          </div>
        )}

        {effectiveTab === 'developer' && (
          <div className={styles.developerTabContent}>
            {isSilverByte ? (
              <div className={styles.studioCard}>
                <div className={styles.studioHeader}>
                  <div className={styles.studioIcon}>
                    <CheckCircle2 size={24} color="#0284c7" />
                  </div>
                  <div>
                    <h3 className={styles.studioTitle}>Silver Byte Studios</h3>
                    <p className={styles.studioSubtitle}>Official Studio & Developer</p>
                  </div>
                </div>
                <p className={styles.studioBio}>
                  This application is directly developed, signed, and maintained by Silver Byte Studios. All packages are built from source and verified.
                </p>
              </div>
            ) : (
              <div className={styles.thirdPartyCard}>
                <div className={styles.studioHeader}>
                  <div className={styles.otherDevIcon}>
                    <UserCheck size={24} color="#6366f1" />
                  </div>
                  <div>
                    <h3 className={styles.studioTitle}>{app.developerName || 'Third-Party Developer'}</h3>
                    <p className={styles.studioSubtitle}>Independent / Community Developer</p>
                  </div>
                </div>
                {app.developerDetails && (
                  <div className={styles.devBioBox}>
                    <p className={styles.devBioText}>{app.developerDetails}</p>
                  </div>
                )}
              </div>
            )}

            <div className={styles.devLinksGrid} style={{ marginTop: 'var(--space-4)' }}>
              {(app.developerWebsite || app.website) && (
                <a
                  href={app.developerWebsite || app.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.devLinkItem}
                >
                  <Globe size={18} />
                  <span>Developer Website</span>
                  <ExternalLink size={12} className={styles.extIcon} />
                </a>
              )}

              {app.developerEmail && (
                <a
                  href={`mailto:${app.developerEmail}`}
                  className={styles.devLinkItem}
                >
                  <Mail size={18} />
                  <span>{app.developerEmail}</span>
                </a>
              )}

              {app.supportUrl && (
                <a href={app.supportUrl} target="_blank" rel="noopener noreferrer" className={styles.devLinkItem}>
                  <LifeBuoy size={18} />
                  <span>Support Center</span>
                  <ExternalLink size={12} className={styles.extIcon} />
                </a>
              )}

              {app.privacyPolicyUrl ? (
                <a href={app.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className={styles.devLinkItem}>
                  <FileText size={18} />
                  <span>Privacy Policy</span>
                  <ExternalLink size={12} className={styles.extIcon} />
                </a>
              ) : (
                <Link href="/privacy" className={styles.devLinkItem}>
                  <FileText size={18} />
                  <span>Privacy Policy</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
