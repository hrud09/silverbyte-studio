'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Share2, Copy, Check, ExternalLink, QrCode as QrIcon } from 'lucide-react';
import QrCode from '@/components/ui/QrCode';
import styles from './page.module.css';

export default function QuickDownloadClient({ app, latestVersion, downloadUrl, storeUrl, quickShareUrl }) {
  const [countdown, setCountdown] = useState(3);
  const [autoStart, setAutoStart] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!autoStart || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Trigger download
          if (typeof window !== 'undefined') {
            window.location.href = downloadUrl;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoStart, countdown, downloadUrl]);

  const copyQuickLink = async () => {
    try {
      await navigator.clipboard.writeText(quickShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Download ${app.name}`,
          text: `Quick download link for ${app.name}:`,
          url: quickShareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyQuickLink();
        }
      }
    } else {
      copyQuickLink();
    }
  };

  return (
    <div className={styles.downloadBox}>
      {countdown > 0 && autoStart ? (
        <p className={styles.countdownText}>
          Your download will begin automatically in{' '}
          <span className={styles.countdownNumber}>{countdown}s</span>...
        </p>
      ) : (
        <p className={styles.countdownText}>
          {countdown === 0 ? 'Your download should have started!' : 'Click below to start your download.'}
        </p>
      )}

      <a
        href={downloadUrl}
        className={styles.mainActionBtn}
        onClick={() => setAutoStart(false)}
      >
        <Download size={20} />
        <span>Direct Download APK</span>
      </a>

      <div className={styles.subActionsRow}>
        <button type="button" onClick={copyQuickLink} className={styles.subBtn}>
          {copied ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
          <span>{copied ? 'Link Copied!' : 'Copy Quick Link'}</span>
        </button>

        <button type="button" onClick={shareNative} className={styles.subBtn}>
          <Share2 size={14} />
          <span>Share</span>
        </button>

        <Link href={storeUrl} className={styles.subBtn}>
          <ExternalLink size={14} />
          <span>Store Details</span>
        </Link>
      </div>

      <div className={styles.qrSection} style={{ marginTop: '2rem' }}>
        <span className={styles.qrTitle}>Scan QR Code on Mobile to Download Directly</span>
        <div className={styles.qrFrame}>
          <QrCode value={quickShareUrl} size={160} />
        </div>
        <span className={styles.qrSubtitle}>Points directly to this Quick Share download link</span>
      </div>
    </div>
  );
}
