import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Download, ShieldCheck, Smartphone, Lock, Clock } from 'lucide-react';
import prisma from '@/lib/db';
import { formatFileSize, formatDate, formatRelativeTime } from '@/lib/utils';
import { PLATFORM_NAME } from '@/lib/constants';
import QrCode from '@/components/ui/QrCode';
import { buildShareUrl } from '@/lib/quickShare';
import { resolvePublicBaseUrl } from '@/lib/publicUrl.server';
import { deleteQuickShare } from '@/lib/quickShare.server';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

async function getShare(token) {
  const share = await prisma.quickShare.findUnique({ where: { token } });
  if (!share || !share.isActive) return null;

  // Auto-delete if expired
  if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
    deleteQuickShare(share.id).catch((err) =>
      console.warn('[quick-share] Cleanup failed on expired page view:', err.message)
    );
    return null;
  }

  return share;
}

export async function generateMetadata({ params }) {
  const { token } = await params;
  const share = await getShare(token);

  if (!share) {
    return { title: 'Link unavailable', robots: { index: false, follow: false } };
  }

  // A private share is unlisted by definition — keeping it out of the index is the
  // difference between "hard to find" and "published".
  if (share.isPrivate) {
    return {
      title: `${share.title} — download`,
      description: 'A private download link.',
      robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    };
  }

  return {
    title: `${share.title} — download`,
    description: `Download ${share.title} from ${PLATFORM_NAME}.`,
    openGraph: { title: share.title, description: `Download ${share.title}`, type: 'website' },
  };
}

export default async function SharePage({ params }) {
  const { token } = await params;
  const share = await getShare(token);

  if (!share) notFound();

  // The QR is scanned by a phone that is not this computer, so it has to encode the
  // address this page is reachable at from outside — never the one in the operator's
  // own address bar.
  const shareUrl = buildShareUrl(share.token, await resolvePublicBaseUrl(await headers()));

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <span className={styles.brandMark}>R</span>
          <span className={styles.brandName}>{PLATFORM_NAME}</span>
          {share.isPrivate && (
            <span className={styles.privateChip}>
              <Lock size={11} />
              <span>Private link</span>
            </span>
          )}
        </div>

        <div className={styles.fileIcon}>
          <Smartphone size={30} />
        </div>

        <h1 className={styles.title}>{share.title}</h1>
        <p className={styles.meta}>
          {share.fileSize > 0 && <span>{formatFileSize(share.fileSize)}</span>}
          {share.fileSize > 0 && <span className={styles.dot} />}
          <span>Shared {formatDate(share.createdAt)}</span>
          {share.expiresAt && (
            <>
              <span className={styles.dot} />
              <span className={styles.expiryBadge} title={`Expires on ${new Date(share.expiresAt).toLocaleString()}`}>
                <Clock size={12} />
                <span>Expires {formatRelativeTime(share.expiresAt)}</span>
              </span>
            </>
          )}
        </p>

        {/* A plain anchor, not a fetch: the browser's own download manager handles
            the stream, which is what a phone needs for a file this size. */}
        <a href={`/api/share/${share.token}/download`} className={styles.downloadBtn} download>
          <Download size={18} />
          <span>Download</span>
        </a>

        <div className={styles.qrBlock}>
          <QrCode value={shareUrl} size={148} title={`QR code for ${share.title}`} />
          <p className={styles.qrCaption}>Scan to open this page on your phone</p>
        </div>

        <div className={styles.installNote}>
          <ShieldCheck size={15} />
          <p>
            After the download finishes, open the file to install. Android may first ask you
            to allow installs from your browser.
          </p>
        </div>
      </div>

      <p className={styles.footer}>
        <Link href="/appstore">{PLATFORM_NAME}</Link>
      </p>
    </main>
  );
}
