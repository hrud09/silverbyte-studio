import prisma from '@/lib/db';
import HeroBanner from '@/components/store/HeroBanner';
import AppSection from '@/components/store/AppSection';
import CategoryIcon from '@/components/store/CategoryIcon';
import Link from 'next/link';
import { Layers, Building2, Users, Sparkles, Clock, Flame } from 'lucide-react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function StoreHomePage() {
  let featuredApps = [];
  let silverByteApps = [];
  let otherDevApps = [];
  let modApps = [];
  let recentlyUpdated = [];
  let topGames = [];
  let productivityApps = [];
  let populatedCategories = [];

  try {
    const publishedApps = await prisma.app.findMany({
      where: { status: 'PUBLISHED' },
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
      orderBy: [
        { featured: 'desc' },
        { featuredOrder: 'asc' },
        { downloads: 'desc' },
      ],
    });

    // Attach latestVersion convenience field
    const formattedApps = publishedApps.map((app) => ({
      ...app,
      latestVersion: app.versions[0] || null,
    }));

    featuredApps = formattedApps.filter((a) => a.featured);
    if (featuredApps.length === 0 && formattedApps.length > 0) {
      featuredApps = formattedApps.slice(0, 3);
    }

    // 1. From Silver Byte Studios (Official)
    silverByteApps = formattedApps
      .filter((a) => (a.developerType || 'SILVER_BYTE') === 'SILVER_BYTE')
      .slice(0, 8);

    // 2. From Other Developers (Third-party)
    otherDevApps = formattedApps
      .filter((a) => a.developerType === 'OTHER')
      .slice(0, 8);

    // 3. Mod Apps & Enhanced Builds
    modApps = formattedApps
      .filter((a) => a.appType === 'MOD')
      .slice(0, 8);

    // 4. Recently updated (by latest version createdAt or app updatedAt)
    recentlyUpdated = [...formattedApps]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 8);

    // 5. Top Games
    topGames = formattedApps
      .filter((a) => a.category?.slug === 'games')
      .slice(0, 8);

    // 6. Productivity Essentials
    productivityApps = formattedApps
      .filter((a) => a.category?.slug === 'productivity' || a.category?.slug === 'utilities')
      .slice(0, 8);

    // All categories - Filter to hide categories with 0 apps
    const allCategories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            apps: { where: { status: 'PUBLISHED' } },
          },
        },
      },
    });

    populatedCategories = allCategories.filter((cat) => (cat._count?.apps || 0) > 0);
  } catch (err) {
    console.error('Error loading store homepage data:', err);
  }

  return (
    <div className={styles.homeContainer}>
      <div className={styles.contentWrapper}>
        {/* 1. Hero Carousel */}
        {featuredApps.length > 0 && <HeroBanner featuredApps={featuredApps} />}

        {/* 2. Silver Byte Studios Originals */}
        {silverByteApps.length > 0 && (
          <AppSection
            title="From Silver Byte Studios"
            subtitle="Official first-party releases and tools built with precision"
            apps={silverByteApps}
            seeAllHref="/search?origin=SILVER_BYTE"
            iconName="Building2"
            layout="shelf"
            tone="red"
          />
        )}

        {/* 3. From Other Developers (Community Showcase) */}
        {otherDevApps.length > 0 && (
          <AppSection
            title="From Other Developers"
            subtitle="Creative and powerful applications crafted by independent creators"
            apps={otherDevApps}
            seeAllHref="/search?origin=OTHER"
            iconName="Users"
            layout="shelf"
            tone="indigo"
          />
        )}

        {/* 4. Mod Apps & Enhanced Editions */}
        {modApps.length > 0 && (
          <AppSection
            title="⚡ Mod Apps & Enhanced Builds"
            subtitle="Special editions featuring unlocked features and optimizations"
            apps={modApps}
            seeAllHref="/search?type=MOD"
            iconName="Sparkles"
            layout="shelf"
            tone="amber"
          />
        )}

        {/* 5. Recently Updated */}
        {recentlyUpdated.length > 0 && (
          <AppSection
            title="Recently Updated"
            subtitle="Fresh updates with new features, improvements, and fixes"
            apps={recentlyUpdated}
            iconName="Clock"
            layout="shelf"
            tone="teal"
          />
        )}

        {/* 6. Top Games */}
        {topGames.length > 0 && (
          <AppSection
            title="Top Games"
            subtitle="Immersive adventures and arcade experiences"
            apps={topGames}
            seeAllHref="/category/games"
            iconName="Flame"
            layout="shelf"
            tone="amber"
          />
        )}

        {/* 7. Productivity & Tools */}
        {productivityApps.length > 0 && (
          <AppSection
            title="Productivity & Utilities"
            subtitle="Essential daily drivers built for speed and privacy"
            apps={productivityApps}
            seeAllHref="/category/productivity"
            iconName="Layers"
            layout="shelf"
            tone="teal"
          />
        )}

        {/* 8. Browse by Category Grid (Only populated categories shown) */}
        {populatedCategories.length > 0 && (
          <section className={`gx-nails ${styles.categoriesSection}`}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.sectionIconChip}>
                  <Layers size={18} />
                </span>
                <h2 className={styles.sectionTitle}>Browse by Category</h2>
              </div>
              <p className={styles.sectionSubtitle}>
                Explore our full collection organized by focus area
              </p>
            </div>

            <div className={styles.categoryGrid}>
              {populatedCategories.map((cat) => (
                <Link
                  key={cat.id || cat.slug}
                  href={`/category/${cat.slug}`}
                  className={styles.categoryCard}
                >
                  <div
                    className={styles.catIconWrapper}
                    style={{ backgroundColor: cat.color || 'var(--gx-gold)' }}
                  >
                    <CategoryIcon name={cat.icon} size={26} color="#fff6e6" />
                  </div>
                  <div className={styles.catInfo}>
                    <h3 className={styles.catName}>{cat.name}</h3>
                    <span className={styles.catCount}>
                      {cat._count?.apps || 0} {cat._count?.apps === 1 ? 'App' : 'Apps'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
