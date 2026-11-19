'use client';

import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  MessageCircle,
  Send,
  Mail,
  Smartphone,
  Zap,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import QrCode from '@/components/ui/QrCode';
import AppIconImg from '@/components/store/AppIconImg';
import {
  getAppIconUrl,
  getAppQuickShareUrl,
  getAppDirectDownloadUrl,
  getAppStoreUrl,
  formatFileSize,
} from '@/lib/utils';
import styles from './ShareModal.module.css';

export default function ShareModal({ app, triggerButton = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'direct' | 'store'
  const [copied, setCopied] = useState(false);

  if (!app) return null;

  const iconUrl = getAppIconUrl(app);
  const latestVersion = app.latestVersion || app.versions?.[0];

  const quickShareUrl = getAppQuickShareUrl(app.slug);
  const directDownloadUrl = getAppDirectDownloadUrl(app.slug);
  const storeUrl = getAppStoreUrl(app.slug);

  const getActiveUrl = () => {
    switch (activeTab) {
      case 'direct':
        return directDownloadUrl;
      case 'store':
        return storeUrl;
      case 'quick':
      default:
        return quickShareUrl;
    }
  };

  const activeUrl = getActiveUrl();

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Download ${app.name} on Silver Red Store`,
          text: `Quick download link for ${app.name}:`,
          url: quickShareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          setIsOpen(true);
        }
      }
    } else {
      setIsOpen(true);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Social sharing links
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Download ${app.name}: ${quickShareUrl}`
  )}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
    quickShareUrl
  )}&text=${encodeURIComponent(`Download ${app.name} APK`)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    `Download ${app.name} APK`
  )}&body=${encodeURIComponent(
    `Here is the quick download link for ${app.name}:\n\n${quickShareUrl}`
  )}`;

  return (
    <>
      {triggerButton ? (
        React.cloneElement(triggerButton, {
          onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleShareClick();
          },
        })
      ) : (
        <button
          type="button"
          onClick={handleShareClick}
          className={`gx-btn gx-btn-paper ${styles.shareTriggerBtn}`}
          aria-label={`Quick share ${app.name}`}
        >
          <Share2 size={16} />
          <span>Quick Share</span>
        </button>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Quick Share — ${app.name}`}
        maxWidth="460px"
      >
        <div className={styles.modalContent}>
          {/* App Preview Card */}
          <div className={styles.appPreviewHeader}>
            <AppIconImg
              src={iconUrl}
              alt={app.name}
              className={styles.previewIcon}
              fallbackSrc={`/api/placeholder/icon/${app.slug}`}
            />
            <div className={styles.previewMeta}>
              <h4 className={styles.previewTitle}>{app.name}</h4>
              <span className={styles.previewSub}>
                {app.developerName || 'Silver Byte Studios'}
                {latestVersion?.versionName ? ` • v${latestVersion.versionName}` : ''}
                {latestVersion?.fileSize ? ` (${formatFileSize(latestVersion.fileSize)})` : ''}
              </span>
            </div>
          </div>

          {/* Link Type Selector */}
          <div className={styles.linkTypeSelector}>
            <button
              type="button"
              className={`${styles.linkTab} ${activeTab === 'quick' ? styles.linkTabActive : ''}`}
              onClick={() => setActiveTab('quick')}
            >
              ⚡ Quick Share Link
            </button>
            <button
              type="button"
              className={`${styles.linkTab} ${activeTab === 'direct' ? styles.linkTabActive : ''}`}
              onClick={() => setActiveTab('direct')}
            >
              📦 Direct APK
            </button>
            <button
              type="button"
              className={`${styles.linkTab} ${activeTab === 'store' ? styles.linkTabActive : ''}`}
              onClick={() => setActiveTab('store')}
            >
              🏪 Store Page
            </button>
          </div>

          {/* QR Code Section */}
          <div className={styles.qrSection}>
            <div className={styles.qrFrame}>
              <QrCode value={activeUrl} size={160} />
            </div>
            <p className={styles.qrHelp}>
              Scan QR code with your phone camera for instant mobile download
            </p>
          </div>

          {/* Copy Link Row */}
          <div className={styles.copyRow}>
            <input
              type="text"
              value={activeUrl}
              readOnly
              className={styles.copyInput}
              onClick={(e) => e.target.select()}
            />
            <Button
              variant={copied ? 'secondary' : 'primary'}
              size="md"
              onClick={copyToClipboard}
              icon={copied ? Check : Copy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Social / Messaging Buttons Grid */}
          <div className={styles.socialGrid}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
            >
              <MessageCircle size={18} style={{ color: '#25D366' }} />
              <span>WhatsApp</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
            >
              <Send size={18} style={{ color: '#0088cc' }} />
              <span>Telegram</span>
            </a>

            <a href={mailtoUrl} className={styles.socialBtn}>
              <Mail size={18} style={{ color: '#ea4335' }} />
              <span>Email</span>
            </a>

            <button
              type="button"
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: app.name, url: activeUrl });
                  } catch (e) {}
                } else {
                  copyToClipboard();
                }
              }}
              className={styles.socialBtn}
            >
              <Share2 size={18} style={{ color: '#38bdf8' }} />
              <span>More</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
