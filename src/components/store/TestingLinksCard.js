'use client';

import React from 'react';
import {
  FlaskConical,
  Smartphone,
  Globe,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import styles from './TestingLinksCard.module.css';

const TRACK_LABELS = {
  CLOSED_TESTING: 'Closed Testing (Google Play)',
  OPEN_TESTING: 'Open Testing (Google Play)',
  INTERNAL_TESTING: 'Internal Testing (Google Play)',
  BETA: 'Public Beta Track',
  WEB_PREVIEW: 'Web Early Access',
};

export default function TestingLinksCard({ app }) {
  if (!app) return null;

  const hasPlayStoreUrl = Boolean(app.playStoreUrl);
  const hasPlayStoreWebUrl = Boolean(app.playStoreWebUrl);
  const hasWebAppUrl = Boolean(app.webAppUrl);
  const isTesting = Boolean(app.isTesting || hasPlayStoreUrl || hasPlayStoreWebUrl || app.testingTrack);

  // If not in testing and has no testing links, don't show the testing card
  if (!isTesting && !hasPlayStoreUrl && !hasPlayStoreWebUrl && !hasWebAppUrl) {
    return null;
  }

  const trackLabel =
    TRACK_LABELS[app.testingTrack] ||
    (app.testingTrack ? app.testingTrack.replace(/_/g, ' ') : 'Early Access / Testing');

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconWrapper}>
            <FlaskConical size={20} />
          </div>
          <div>
            <h2 className={styles.title}>Testing & Early Access Program</h2>
            <p className={styles.subtitle}>
              This application is in active testing. Choose your preferred way to test and receive updates.
            </p>
          </div>
        </div>

        <div className={styles.trackBadge}>
          <Sparkles size={12} />
          <span>{trackLabel}</span>
        </div>
      </div>

      {app.testingInstructions && (
        <div className={styles.instructionsBox}>
          <div className={styles.instructionsTitle}>Tester Instructions & Notes</div>
          <div className={styles.instructionsContent}>{app.testingInstructions}</div>
        </div>
      )}

      {/* Action Buttons for Testing */}
      <div className={styles.actionsGrid}>
        {hasPlayStoreUrl && (
          <a
            href={app.playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.playStoreBtn}`}
            title="Open in Google Play Store on Android"
          >
            <div className={styles.btnIcon}>
              <Smartphone size={18} />
            </div>
            <div className={styles.btnText}>
              <span className={styles.btnTitle}>Join on Android</span>
              <span className={styles.btnSub}>Direct Play Store App Link</span>
            </div>
            <ExternalLink size={14} className={styles.externalIcon} />
          </a>
        )}

        {hasPlayStoreWebUrl && (
          <a
            href={app.playStoreWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.playWebBtn}`}
            title="Opt-in to Google Play Testing Program on the Web"
          >
            <div className={styles.btnIcon}>
              <Globe size={18} />
            </div>
            <div className={styles.btnText}>
              <span className={styles.btnTitle}>Join on the Web</span>
              <span className={styles.btnSub}>Play Store Web Opt-In</span>
            </div>
            <ExternalLink size={14} className={styles.externalIcon} />
          </a>
        )}

        {hasWebAppUrl && (
          <a
            href={app.webAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.actionBtn} ${styles.webAppBtn}`}
            title="Launch Web App / Live Web Version"
          >
            <div className={styles.btnIcon}>
              <Globe size={18} />
            </div>
            <div className={styles.btnText}>
              <span className={styles.btnTitle}>Open Web App</span>
              <span className={styles.btnSub}>Live Web Testing Version</span>
            </div>
            <ExternalLink size={14} className={styles.externalIcon} />
          </a>
        )}
      </div>

      {/* Step by Step Guide if Play Store testing links exist */}
      {(hasPlayStoreUrl || hasPlayStoreWebUrl) && (
        <div className={styles.stepsGuide}>
          <div className={styles.stepsTitle}>How Google Play Testing Works</div>
          {hasPlayStoreWebUrl && (
            <div className={styles.stepRow}>
              <span className={styles.stepNum}>1</span>
              <span>
                <strong>Opt in:</strong> Tap <em>Join on the Web</em> and log in with your tester Google account to accept the invite.
              </span>
            </div>
          )}
          <div className={styles.stepRow}>
            <span className={styles.stepNum}>{hasPlayStoreWebUrl ? '2' : '1'}</span>
            <span>
              <strong>Install & auto-update:</strong> Tap <em>Join on Android</em> to download directly via Google Play Store with automatic background updates.
            </span>
          </div>
          <div className={styles.stepRow}>
            <span className={styles.stepNum}>{hasPlayStoreWebUrl ? '3' : '2'}</span>
            <span>
              <strong>Direct APK:</strong> Alternatively, use the Download APK button above for offline sideload installation.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
