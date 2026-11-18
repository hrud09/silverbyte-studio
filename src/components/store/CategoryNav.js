'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Building2, Users, Sparkles } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import styles from './CategoryNav.module.css';

function CategoryNavContent({ categories = [] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const originParam = searchParams?.get('origin');
  const typeParam = searchParams?.get('type');

  const isHomeActive = pathname === '/appstore' && !originParam && !typeParam;
  const isSilverByteActive = pathname === '/search' && originParam === 'SILVER_BYTE';
  const isOtherDevsActive = pathname === '/search' && originParam === 'OTHER';
  const isModAppsActive = pathname === '/search' && typeParam === 'MOD';

  // Double check only populated categories are displayed
  const visibleCategories = categories.filter((c) => (c._count?.apps === undefined || c._count.apps > 0));

  return (
    <nav className={styles.navWrapper} aria-label="App categories">
      <div className={styles.container}>
        <div className={styles.scrollArea}>
          {/* Explore / Home Pill */}
          <Link
            href="/appstore"
            className={`${styles.pill} ${isHomeActive ? styles.active : ''}`}
          >
            <CategoryIcon name="Compass" size={16} />
            <span>Discover</span>
          </Link>

          {/* Major Category: Silver Byte Studios */}
          <Link
            href="/search?origin=SILVER_BYTE"
            className={`${styles.pill} ${isSilverByteActive ? styles.active : ''}`}
          >
            <Building2 size={15} />
            <span>Silver Byte Originals</span>
          </Link>

          {/* Major Category: Other Developers */}
          <Link
            href="/search?origin=OTHER"
            className={`${styles.pill} ${isOtherDevsActive ? styles.active : ''}`}
          >
            <Users size={15} />
            <span>Other Developers</span>
          </Link>

          {/* Major Category: Mod Apps */}
          <Link
            href="/search?type=MOD"
            className={`${styles.pill} ${isModAppsActive ? styles.modActive : ''}`}
          >
            <Sparkles size={15} />
            <span>Mod Apps</span>
          </Link>

          {visibleCategories.length > 0 && <div className={styles.navDivider} />}

          {visibleCategories.map((cat) => {
            const isActive = pathname === `/category/${cat.slug}`;
            return (
              <Link
                key={cat.id || cat.slug}
                href={`/category/${cat.slug}`}
                className={`${styles.pill} ${isActive ? styles.active : ''}`}
              >
                <CategoryIcon name={cat.icon} size={16} />
                <span>{cat.name}</span>
                {cat._count?.apps !== undefined && cat._count.apps > 0 && (
                  <span className={styles.countBadge}>{cat._count.apps}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function CategoryNav({ categories = [] }) {
  return (
    <Suspense
      fallback={
        <nav className={styles.navWrapper} aria-label="App categories">
          <div className={styles.container}>
            <div className={styles.scrollArea} style={{ minHeight: 48 }} />
          </div>
        </nav>
      }
    >
      <CategoryNavContent categories={categories} />
    </Suspense>
  );
}
