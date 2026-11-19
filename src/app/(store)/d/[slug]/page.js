import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Share2, ArrowLeft, ShieldCheck, CheckCircle2, Zap, Sparkles } from 'lucide-react';
import {
  formatFileSize,
  formatCompactNumber,
  getAppIconUrl,
  getAppQuickShareUrl,
  getAppDirectDownloadUrl,
  getAppStoreUrl,
} from '@/lib/utils';
import AppIconImg from '@/components/store/AppIconImg';
import QuickDownloadClient from './QuickDownloadClient';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const app = await prisma.app.findUnique({
      where: { slug },
      include: {
        versions: { where: { status: 'PUBLISHED' }, orderBy: { versionCode: 'desc' }, take: 1 },
      },
    });

    if (!app) return { title: 'Download Not Found | Silver Red Store' };

    return {
      title: `Quick Download: ${app.name} APK | Silver Red Store`,
      description: `Quick download link for ${app.name}. Fast, direct APK download from Silver Red Store.`,
    };
  } catch (err) {
    return { title: 'Quick Share Download | Silver Red Store' };
  }
}

export default async function QuickDownloadPage({ params }) {
  const { slug } = await params;

  const app = await prisma.app.findUnique({
    where: { slug },
    include: {
      category: true,
      versions: {
        where: { status: 'PUBLISHED' },
        orderBy: { versionCode: 'desc' },
      },
      assets: true,
    },
  });

  if (!app || app.status !== 'PUBLISHED') {
    notFound();
  }

  const latestVersion = app.versions[0] || null;
  const iconUrl = getAppIconUrl(app);
  const isSilverByte = (app.developerType || 'SILVER_BYTE') === 'SILVER_BYTE';
  const isMod = app.appType === 'MOD';

  const downloadUrl = getAppDirectDownloadUrl(app.slug);
  const storeUrl = getAppStoreUrl(app.slug);
  const quickShareUrl = getAppQuickShareUrl(app.slug);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.topBadgeRow}>
          <span className={styles.quickShareTag}>
            <Share2 size={14} />
            <span>Quick Share Download</span>
          </span>
          <Link href={storeUrl} className={styles.storeLinkText}>
            <span>View Full App Page</span>
            <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
          </Link>
        </div>

        {/* App Hero */}
        <div className={styles.hero}>
          <div className={styles.iconWrapper}>
            <AppIconImg
              src={iconUrl}
              alt={`${app.name} icon`}
              className={styles.icon}
              fallbackSrc={`/api/placeholder/icon/${app.slug}`}
            />
          </div>

          <div className={styles.heroMeta}>
            <h1 className={styles.title}>{app.name}</h1>
            <div className={styles.devRow}>
              <span>{app.developerName || (isSilverByte ? 'Silver Byte Studios' : 'Other Developer')}</span>
              {isSilverByte && <CheckCircle2 size={14} style={{ color: '#0284c7' }} />}
            </div>

            <div className={styles.badges}>
              {latestVersion?.versionName && (
                <span className={styles.badge}>v{latestVersion.versionName}</span>
              )}
              {latestVersion?.fileSize ? (
                <span className={styles.badge}>{formatFileSize(latestVersion.fileSize)}</span>
              ) : null}
              {app.category && <span className={styles.badge}>{app.category.name}</span>}
              {isMod && (
                <span className={`${styles.badge} ${styles.badgeMod}`}>
                  <Zap size={11} style={{ display: 'inline', marginRight: 3 }} />
                  MOD APP
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Auto-Download & Share Section */}
        <QuickDownloadClient
          app={app}
          latestVersion={latestVersion}
          downloadUrl={downloadUrl}
          storeUrl={storeUrl}
          quickShareUrl={quickShareUrl}
        />
      </div>
    </div>
  );
}
