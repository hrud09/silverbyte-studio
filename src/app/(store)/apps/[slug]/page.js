import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Sparkles,
  FlaskConical,
  ExternalLink,
  Globe,
  Smartphone,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { formatRelativeTime, formatFileSize, formatCompactNumber, getAppIconUrl, getAppFeatureUrl, resolveMediaUrl } from '@/lib/utils';
import ScreenshotGallery from '@/components/store/ScreenshotGallery';
import VersionHistoryList from '@/components/store/VersionHistoryList';
import ShareModal from '@/components/store/ShareModal';
import DownloadButton from '@/components/store/DownloadButton';
import AppIconImg from '@/components/store/AppIconImg';
import AppDetailTabs from '@/components/store/AppDetailTabs';
import AppSection from '@/components/store/AppSection';
import TestingLinksCard from '@/components/store/TestingLinksCard';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;

  try {
    const app = await prisma.app.findUnique({
      where: { slug },
      include: {
        category: true,
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { versionCode: 'desc' },
          take: 1,
        },
        assets: true,
      },
    });

    if (!app) {
      return {
        title: 'App Not Found | Silver Red Store',
        description: 'The requested app could not be found.',
      };
    }

    const latestVersion = app.versions[0];
    const iconUrl = getAppIconUrl(app);
    const featureUrl = getAppFeatureUrl(app);
    const ogImage = featureUrl || iconUrl;
    const authorName = app.developerName || (app.developerType === 'OTHER' ? 'Third-Party Developer' : 'Silver Byte Studios');

    return {
      title: `${app.name} - Download APK | Silver Red Store`,
      description: app.shortDescription,
      openGraph: {
        title: `${app.name} - Download APK by ${authorName}`,
        description: app.shortDescription,
        type: 'website',
        images: [{ url: ogImage, width: 1024, height: 500, alt: app.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${app.name} | Silver Red Store`,
        description: app.shortDescription,
        images: [ogImage],
      },
      other: {
        'application-name': app.name,
        'app:package_id': app.packageId,
        ...(latestVersion?.versionName ? { 'app:version': latestVersion.versionName } : {}),
      },
    };
  } catch (err) {
    return {
      title: 'Silver Red Store — App Store',
    };
  }
}

export default async function AppDetailPage({ params }) {
  const { slug } = await params;

  const app = await prisma.app.findUnique({
    where: { slug },
    include: {
      category: true,
      versions: {
        where: { status: 'PUBLISHED' },
        orderBy: { versionCode: 'desc' },
      },
      assets: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!app || app.status !== 'PUBLISHED') {
    notFound();
  }

  // Increment pageViews in background
  prisma.app.update({
    where: { id: app.id },
    data: { pageViews: { increment: 1 } },
  }).catch(() => {});

  const isSilverByte = (app.developerType || 'SILVER_BYTE') === 'SILVER_BYTE';
  const isMod = app.appType === 'MOD';
  const latestVersion = app.versions[0] || null;
  const iconUrl = getAppIconUrl(app);
  const featureUrl = getAppFeatureUrl(app);

  const rawScreenshots = app.assets.filter((a) => a.type === 'SCREENSHOT');
  const finalScreenshots = rawScreenshots.map((s, idx) => ({
    ...s,
    url: resolveMediaUrl(s.url, app.slug, 'screenshot', idx + 1),
  }));

  // Fetch more apps (prefer same developer or category, excluding current)
  const moreApps = await prisma.app.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: app.id },
      ...(isSilverByte ? { developerType: 'SILVER_BYTE' } : { developerType: 'OTHER' }),
    },
    include: {
      category: true,
      versions: {
        where: { status: 'PUBLISHED' },
        orderBy: { versionCode: 'desc' },
      },
      assets: true,
    },
    take: 6,
  });

  const formattedMoreApps = moreApps.map((a) => ({
    ...a,
    latestVersion: a.versions[0] || null,
  }));

  // JSON-LD structured data for Google Search SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    applicationCategory: app.category?.name || 'UtilitiesApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: app.developerName || (isSilverByte ? 'Silver Byte Studios' : 'Other Developer'),
    },
    ...(latestVersion?.minOsVersion ? { operatingSystem: latestVersion.minOsVersion } : {}),
    ...(latestVersion?.versionName ? { softwareVersion: latestVersion.versionName } : {}),
    ...(latestVersion?.fileSize ? { fileSize: formatFileSize(latestVersion.fileSize) } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className={`product-page-container ${styles.pageContainer}`}>
          {/* Breadcrumbs — the portfolio's plaque trail */}
          <nav className="breadcrumb-nav" aria-label="Breadcrumb">
            <ol className="breadcrumb-list">
              <li className="breadcrumb-item"><Link href="/appstore">App Store</Link></li>
              <li className="breadcrumb-separator" aria-hidden="true">/</li>
              {app.category && (
                <>
                  <li className="breadcrumb-item">
                    <Link href={`/category/${app.category.slug}`}>{app.category.name}</Link>
                  </li>
                  <li className="breadcrumb-separator" aria-hidden="true">/</li>
                </>
              )}
              <li className="breadcrumb-item current" aria-current="page">{app.name}</li>
            </ol>
          </nav>

          {/* Product hero — same card as the portfolio's product pages */}
          <article className={`product-hero ${styles.productHero}`}>
            <div className="product-hero-banner">
              <AppIconImg
                src={featureUrl}
                alt={`${app.name} feature graphic`}
                className={styles.featureImg}
                fallbackSrc={`/api/placeholder/feature/${app.slug}`}
              />
            </div>

            <div className={`product-hero-body ${styles.heroBody}`}>
              <div className="product-header-main">
                <AppIconImg
                  src={iconUrl}
                  alt={`${app.name} icon`}
                  className="product-icon-large"
                  fallbackSrc={`/api/placeholder/icon/${app.slug}`}
                />
                <div className="product-title-group">
                  <h1>{app.name}</h1>
                  <div className="tag-list">
                    {app.category && (
                      <Link href={`/category/${app.category.slug}`} className="gx-badge gx-badge-paper">
                        {app.category.name}
                      </Link>
                    )}
                    <span className={`gx-badge ${isSilverByte ? 'gx-badge-teal' : 'gx-badge-wood'}`}>
                      {isSilverByte && <CheckCircle2 size={12} />}
                      {isSilverByte ? 'Official Silver Byte' : (app.developerName || 'Other Developer')}
                    </span>
                    {isMod && (
                      <span className="gx-badge" title="Mod App / Enhanced Build">
                        <Zap size={12} />
                        <span>Mod App</span>
                      </span>
                    )}
                    {app.featured && (
                      <span className="gx-badge gx-badge-gold" title="Featured App">
                        <Sparkles size={12} />
                        <span>Featured</span>
                      </span>
                    )}
                    {(app.isTesting || app.playStoreUrl || app.playStoreWebUrl) && (
                      <span className="gx-badge gx-badge-olive">
                        <FlaskConical size={12} />
                        <span>{app.testingTrack ? app.testingTrack.replace(/_/g, ' ') : 'Testing'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {app.shortDescription && <p className="product-tagline">{app.shortDescription}</p>}

              {/* Stat slots */}
              <div className={styles.statsRow}>
                <div className={`gx-slot ${styles.statItem}`}>
                  <span className={styles.statVal}>{formatCompactNumber(app.downloads || 0)}</span>
                  <span className={styles.statSub}>Downloads</span>
                </div>
                <div className={`gx-slot ${styles.statItem}`}>
                  <span className={styles.statVal}>
                    {latestVersion?.fileSize ? formatFileSize(latestVersion.fileSize) : '—'}
                  </span>
                  <span className={styles.statSub}>APK Size</span>
                </div>
                <div className={`gx-slot ${styles.statItem}`}>
                  <span className={styles.statVal}>
                    {latestVersion?.versionName ? `v${latestVersion.versionName}` : '—'}
                  </span>
                  <span className={styles.statSub}>Latest</span>
                </div>
                <div className={`gx-slot ${styles.statItem}`}>
                  <span className={styles.statVal}>
                    {formatRelativeTime(latestVersion?.createdAt || app.updatedAt)}
                  </span>
                  <span className={styles.statSub}>Updated</span>
                </div>
              </div>

              {/* Primary Download & Testing Action CTAs */}
              <div className={`product-actions-bar ${styles.ctaRow}`}>
                <DownloadButton
                  appSlug={app.slug}
                  appName={app.name}
                  latestVersion={latestVersion}
                />

                {app.playStoreUrl && (
                  <a
                    href={app.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gx-btn gx-btn-teal"
                    title="Open in Google Play Store (Android Testing)"
                  >
                    <Smartphone size={16} />
                    <span>Play Store</span>
                    <ExternalLink size={13} />
                  </a>
                )}

                {app.playStoreWebUrl && (
                  <a
                    href={app.playStoreWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gx-btn gx-btn-wood"
                    title="Join Google Play Testing Program on the Web"
                  >
                    <Globe size={16} />
                    <span>Join on Web</span>
                    <ExternalLink size={13} />
                  </a>
                )}

                {app.webAppUrl && (
                  <a
                    href={app.webAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gx-btn gx-btn-wood"
                    title="Open Live Web Application"
                  >
                    <Globe size={16} />
                    <span>Open Web App</span>
                    <ExternalLink size={13} />
                  </a>
                )}

                <ShareModal app={app} />
              </div>

              <div className={styles.verifiedRow}>
                <ShieldCheck size={16} className={styles.verifiedIcon} />
                <span>
                  {isSilverByte
                    ? 'Official release, developed & distributed directly by Silver Byte Studios'
                    : `Distributed on Silver Red Store from ${app.developerName || 'third-party developer'}`}
                </span>
              </div>
            </div>
          </article>

          {/* Mod App Highlights Alert */}
          {isMod && app.modDetails && (
            <div className={styles.modAlertCard}>
              <Zap size={20} className={styles.modAlertIcon} />
              <div className={styles.modAlertContent}>
                <h4 className={styles.modAlertTitle}>Mod App Highlights &amp; Features</h4>
                <p className={styles.modAlertText}>{app.modDetails}</p>
              </div>
            </div>
          )}

          {/* Screenshot Gallery */}
          <ScreenshotGallery screenshots={finalScreenshots} appName={app.name} />

          {/* Testing & Early Access Program Card */}
          <TestingLinksCard app={app} />

          {/* About / What's New / Specifications / Developer — tabbed to keep this scannable */}
          <AppDetailTabs app={app} latestVersion={latestVersion} />

          {/* Version History List */}
          <VersionHistoryList versions={app.versions} appSlug={app.slug} />

          {/* More Apps Shelf */}
          {formattedMoreApps.length > 0 && (
            <AppSection
              title={isSilverByte ? "More from Silver Byte Studios" : `More Apps from ${app.developerName || 'Other Developers'}`}
              subtitle={isSilverByte ? "Discover other apps by the studio" : "Discover more community and third-party creations"}
              apps={formattedMoreApps}
              layout="shelf"
            />
          )}
      </div>
    </>
  );
}
