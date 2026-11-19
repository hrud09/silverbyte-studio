import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import CategoryIcon from '@/components/store/CategoryIcon';
import AppCard from '@/components/store/AppCard';
import EmptyState from '@/components/ui/EmptyState';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const category = await prisma.category.findUnique({
      where: { slug },
    });
    if (!category) return { title: 'Category Not Found | Silver Red Store' };
    return {
      title: `${category.name} Apps & Games | Silver Red Store`,
      description: `Explore ${category.name} apps and games on Silver Red Store.`,
    };
  } catch (e) {
    return { title: 'Categories | Silver Red Store' };
  }
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const {
    sort = 'popular',
    origin: selectedOrigin,
    type: selectedType,
  } = (await searchParams) || {};

  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  // Determine order by
  let orderBy = [{ downloads: 'desc' }];
  if (sort === 'newest') {
    orderBy = [{ createdAt: 'desc' }];
  } else if (sort === 'name') {
    orderBy = [{ name: 'asc' }];
  }

  const where = {
    categoryId: category.id,
    status: 'PUBLISHED',
  };

  if (selectedOrigin && (selectedOrigin === 'SILVER_BYTE' || selectedOrigin === 'OTHER')) {
    where.developerType = selectedOrigin;
  }

  if (selectedType && (selectedType === 'NORMAL' || selectedType === 'MOD')) {
    where.appType = selectedType;
  }

  const apps = await prisma.app.findMany({
    where,
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
    orderBy,
  });

  const formattedApps = apps.map((app) => ({
    ...app,
    latestVersion: app.versions[0] || null,
  }));

  const buildCategoryUrl = (paramsToUpdate) => {
    const currentParams = {
      ...(sort && sort !== 'popular' ? { sort } : {}),
      ...(selectedOrigin ? { origin: selectedOrigin } : {}),
      ...(selectedType ? { type: selectedType } : {}),
      ...paramsToUpdate,
    };

    const validParams = Object.entries(currentParams).filter(
      ([, val]) => val !== undefined && val !== null && val !== ''
    );

    if (validParams.length === 0) return `/category/${slug}`;
    const sp = new URLSearchParams(validParams);
    return `/category/${slug}?${sp.toString()}`;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Breadcrumbs */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            <li className="breadcrumb-item"><Link href="/appstore">App Store</Link></li>
            <li className="breadcrumb-separator" aria-hidden="true">/</li>
            <li className="breadcrumb-item current" aria-current="page">{category.name}</li>
          </ol>
        </nav>

        {/* Category Header */}
        <div className={styles.header}>
          <div
            className={styles.iconWrapper}
            style={{ backgroundColor: category.color || 'var(--gx-gold)' }}
          >
            <CategoryIcon name={category.icon} size={34} color="#fff6e6" />
          </div>

          <div className={styles.headerInfo}>
            <h1 className={styles.categoryTitle}>{category.name}</h1>
            <p className={styles.categoryCount}>
              {formattedApps.length} {formattedApps.length === 1 ? 'app available' : 'apps available'}
            </p>
          </div>
        </div>

        {/* Controls & Filter Bar */}
        <div className={styles.controlsBar}>
          <span className={styles.sortLabel}>Sort:</span>
          <div className={styles.sortPills}>
            <Link
              href={buildCategoryUrl({ sort: 'popular' })}
              className={`${styles.sortPill} ${sort === 'popular' ? styles.activePill : ''}`}
            >
              Most Popular
            </Link>
            <Link
              href={buildCategoryUrl({ sort: 'newest' })}
              className={`${styles.sortPill} ${sort === 'newest' ? styles.activePill : ''}`}
            >
              Recently Released
            </Link>
            <Link
              href={buildCategoryUrl({ sort: 'name' })}
              className={`${styles.sortPill} ${sort === 'name' ? styles.activePill : ''}`}
            >
              Name (A-Z)
            </Link>
          </div>

          <span className={styles.sortLabel} style={{ marginLeft: 'var(--space-2)' }}>Filter:</span>
          <div className={styles.sortPills}>
            <Link
              href={buildCategoryUrl({ origin: '', type: '' })}
              className={`${styles.sortPill} ${!selectedOrigin && !selectedType ? styles.activePill : ''}`}
            >
              All
            </Link>
            <Link
              href={buildCategoryUrl({ origin: 'SILVER_BYTE', type: '' })}
              className={`${styles.sortPill} ${selectedOrigin === 'SILVER_BYTE' ? styles.activePill : ''}`}
            >
              Silver Byte
            </Link>
            <Link
              href={buildCategoryUrl({ origin: 'OTHER', type: '' })}
              className={`${styles.sortPill} ${selectedOrigin === 'OTHER' ? styles.activePill : ''}`}
            >
              Other Devs
            </Link>
            <Link
              href={buildCategoryUrl({ type: 'MOD', origin: '' })}
              className={`${styles.sortPill} ${selectedType === 'MOD' ? styles.activePill : ''}`}
            >
              ⚡ Mod Apps
            </Link>
          </div>
        </div>

        {/* Apps Grid */}
        {formattedApps.length > 0 ? (
          <div className={styles.appsGrid}>
            {formattedApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={`No matching ${category.name} apps`}
            description="No published apps in this category match your selected origin or type filters."
            action={
              <Link href={`/category/${slug}`} className={`gx-btn gx-btn-red ${styles.backBtn}`}>
                Clear Category Filters
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
