import prisma from '@/lib/db';
import Link from 'next/link';
import { Search, ChevronRight, Filter, Zap, CheckCircle2, Users } from 'lucide-react';
import AppCard from '@/components/store/AppCard';
import EmptyState from '@/components/ui/EmptyState';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ searchParams }) {
  const { q, origin, type } = (await searchParams) || {};
  let title = 'Search Apps & Games | Silver Red Store';
  if (q) {
    title = `Search results for "${q}" | Silver Red Store`;
  } else if (origin === 'SILVER_BYTE') {
    title = 'Silver Byte Studios Apps | Silver Red Store';
  } else if (origin === 'OTHER') {
    title = 'Other Developers Apps | Silver Red Store';
  } else if (type === 'MOD') {
    title = 'Mod Apps & Enhanced Builds | Silver Red Store';
  }

  return {
    title,
    description: 'Find apps and games on Silver Red Store.',
  };
}

export default async function SearchPage({ searchParams }) {
  const {
    q = '',
    category: selectedCategory,
    origin: selectedOrigin,
    type: selectedType,
  } = (await searchParams) || {};
  const query = q.trim();

  const where = {
    status: 'PUBLISHED',
  };

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { shortDescription: { contains: query, mode: 'insensitive' } },
      { fullDescription: { contains: query, mode: 'insensitive' } },
      { tags: { contains: query, mode: 'insensitive' } },
      { packageId: { contains: query, mode: 'insensitive' } },
      { developerName: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (selectedCategory) {
    where.category = { slug: selectedCategory };
  }

  if (selectedOrigin && (selectedOrigin === 'SILVER_BYTE' || selectedOrigin === 'OTHER')) {
    where.developerType = selectedOrigin;
  }

  if (selectedType && (selectedType === 'NORMAL' || selectedType === 'MOD')) {
    where.appType = selectedType;
  }

  const [apps, rawCategories] = await Promise.all([
    prisma.app.findMany({
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
      orderBy: [{ downloads: 'desc' }],
    }),
    prisma.category.findMany({
      include: {
        _count: {
          select: {
            apps: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    }),
  ]);

  // Hide empty categories from the public search facet bar
  const categories = rawCategories.filter((cat) => (cat._count?.apps || 0) > 0);

  const formattedApps = apps.map((app) => ({
    ...app,
    latestVersion: app.versions[0] || null,
  }));

  // Build query string helper for facet links
  const buildSearchUrl = (paramsToUpdate) => {
    const currentParams = {
      ...(query ? { q: query } : {}),
      ...(selectedCategory ? { category: selectedCategory } : {}),
      ...(selectedOrigin ? { origin: selectedOrigin } : {}),
      ...(selectedType ? { type: selectedType } : {}),
      ...paramsToUpdate,
    };

    // Remove any undefined or empty keys
    const validParams = Object.entries(currentParams).filter(
      ([, val]) => val !== undefined && val !== null && val !== ''
    );

    if (validParams.length === 0) return '/search';
    const sp = new URLSearchParams(validParams);
    return `/search?${sp.toString()}`;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/appstore" className={styles.crumbLink}>Store</Link>
          <ChevronRight size={14} className={styles.crumbSep} />
          <span className={styles.crumbActive}>Search</span>
        </nav>

        {/* Search Title & Summary */}
        <div className={styles.searchHeader}>
          <h1 className={styles.pageTitle}>
            {query ? (
              <>
                Results for <span className={styles.queryHighlight}>&ldquo;{query}&rdquo;</span>
              </>
            ) : selectedOrigin === 'SILVER_BYTE' ? (
              'From Silver Byte Studios'
            ) : selectedOrigin === 'OTHER' ? (
              'From Other Developers'
            ) : selectedType === 'MOD' ? (
              '⚡ Mod Apps & Enhanced Builds'
            ) : (
              'Search All Apps'
            )}
          </h1>
          <p className={styles.resultCount}>
            Found {formattedApps.length} {formattedApps.length === 1 ? 'app' : 'apps'}
          </p>
        </div>

        {/* Major Classification Facet Bar (Origin & Type) */}
        <div className={styles.facetBar}>
          <span className={styles.facetLabel}>Collection:</span>
          <div className={styles.facetChips}>
            <Link
              href={buildSearchUrl({ origin: '', type: '' })}
              className={`${styles.facetChip} ${!selectedOrigin && !selectedType ? styles.activeChip : ''}`}
            >
              All Apps
            </Link>
            <Link
              href={buildSearchUrl({ origin: 'SILVER_BYTE', type: '' })}
              className={`${styles.facetChip} ${selectedOrigin === 'SILVER_BYTE' ? styles.activeChip : ''}`}
            >
              Silver Byte Originals
            </Link>
            <Link
              href={buildSearchUrl({ origin: 'OTHER', type: '' })}
              className={`${styles.facetChip} ${selectedOrigin === 'OTHER' ? styles.activeChip : ''}`}
            >
              Other Developers
            </Link>
            <Link
              href={buildSearchUrl({ type: 'MOD', origin: '' })}
              className={`${styles.facetChip} ${selectedType === 'MOD' ? styles.activeChip : ''}`}
            >
              ⚡ Mod Apps
            </Link>
          </div>
        </div>

        {/* Category Facet Chips (Only populated categories) */}
        {categories.length > 0 && (
          <div className={styles.facetBar}>
            <span className={styles.facetLabel}>Category:</span>
            <div className={styles.facetChips}>
              <Link
                href={buildSearchUrl({ category: '' })}
                className={`${styles.facetChip} ${!selectedCategory ? styles.activeChip : ''}`}
              >
                All Categories
              </Link>
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.slug;
                return (
                  <Link
                    key={cat.id || cat.slug}
                    href={buildSearchUrl({ category: cat.slug })}
                    className={`${styles.facetChip} ${isActive ? styles.activeChip : ''}`}
                  >
                    {cat.name} ({cat._count?.apps || 0})
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Grid */}
        {formattedApps.length > 0 ? (
          <div className={styles.resultsGrid}>
            {formattedApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title={query ? `No results found for "${query}"` : 'No apps match your filter criteria'}
            description="Try selecting different filters or searching with general keywords like 'game', 'tool', or 'note'."
            action={
              <Link href="/search" className={styles.backBtn}>
                Clear All Filters
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
