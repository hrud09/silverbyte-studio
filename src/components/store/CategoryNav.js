'use client';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Building2,
  Users,
  Sparkles,
  ChevronDown,
  Layers,
  Check,
} from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import styles from './CategoryNav.module.css';

function CategoryNavContent({ categories = [] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const originParam = searchParams?.get('origin');
  const typeParam = searchParams?.get('type');

  // Active state determinations
  const isHomeActive = pathname === '/appstore' && !originParam && !typeParam;
  const isSilverByteActive = pathname === '/search' && originParam === 'SILVER_BYTE';
  const isOtherDevsActive = pathname === '/search' && originParam === 'OTHER';
  const isModAppsActive = pathname === '/search' && typeParam === 'MOD';

  // Categories with apps
  const visibleCategories = categories.filter(
    (c) => c._count?.apps === undefined || c._count.apps > 0
  );

  const activeCategory = visibleCategories.find((c) => pathname === `/category/${c.slug}`);
  const isCategoryActive = Boolean(activeCategory);

  const activeOrigin = isSilverByteActive
    ? 'Silver Byte Originals'
    : isOtherDevsActive
    ? 'Other Developers'
    : null;

  // Dropdown open states
  const [openMenu, setOpenMenu] = useState(null); // 'categories' | 'origin' | null
  const navRef = useRef(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setOpenMenu(null);
  }, [pathname, searchParams]);

  const toggleMenu = (menuKey) => {
    setOpenMenu((prev) => (prev === menuKey ? null : menuKey));
  };

  return (
    <nav className={styles.navWrapper} aria-label="App categories" ref={navRef}>
      <div className={styles.container}>
        <div className={styles.navRow}>
          {/* Discover / All Home Pill */}
          <Link
            href="/appstore"
            className={`${styles.pill} ${isHomeActive ? styles.active : ''}`}
          >
            <CategoryIcon name="Compass" size={16} />
            <span>Discover</span>
          </Link>

          {/* Categories Dropdown Menu */}
          <div className={styles.dropdownWrapper}>
            <button
              type="button"
              className={`${styles.pill} ${styles.dropdownTrigger} ${
                isCategoryActive || openMenu === 'categories' ? styles.active : ''
              }`}
              onClick={() => toggleMenu('categories')}
              aria-expanded={openMenu === 'categories'}
              aria-haspopup="true"
            >
              {activeCategory ? (
                <CategoryIcon name={activeCategory.icon} size={16} />
              ) : (
                <Layers size={16} />
              )}
              <span className={styles.dropdownLabel}>
                {activeCategory ? activeCategory.name : 'Categories'}
              </span>
              {activeCategory?._count?.apps !== undefined && activeCategory._count.apps > 0 && (
                <span className={styles.countBadge}>{activeCategory._count.apps}</span>
              )}
              <ChevronDown
                size={14}
                className={`${styles.chevron} ${
                  openMenu === 'categories' ? styles.chevronRotated : ''
                }`}
              />
            </button>

            {openMenu === 'categories' && (
              <div
                className={`${styles.menuPanel} ${styles.categoriesMenu}`}
                role="menu"
                aria-label="App Categories"
              >
                <div className={styles.menuHeader}>
                  <span className={styles.menuTitle}>Browse Categories</span>
                  <span className={styles.menuSubtitle}>
                    {visibleCategories.length} {visibleCategories.length === 1 ? 'Topic' : 'Topics'}
                  </span>
                </div>

                <div className={styles.menuGrid}>
                  {visibleCategories.map((cat) => {
                    const isSelected = pathname === `/category/${cat.slug}`;
                    return (
                      <Link
                        key={cat.id || cat.slug}
                        href={`/category/${cat.slug}`}
                        role="menuitem"
                        className={`${styles.categoryMenuItem} ${
                          isSelected ? styles.categoryMenuItemActive : ''
                        }`}
                        onClick={() => setOpenMenu(null)}
                      >
                        <div
                          className={styles.menuIconBox}
                          style={{
                            backgroundColor: cat.color || 'var(--gx-gold)',
                          }}
                        >
                          <CategoryIcon name={cat.icon} size={16} color="#fff6e6" />
                        </div>
                        <div className={styles.menuItemDetails}>
                          <span className={styles.menuItemName}>{cat.name}</span>
                          {cat._count?.apps !== undefined && (
                            <span className={styles.menuItemCount}>
                              {cat._count.apps} {cat._count.apps === 1 ? 'app' : 'apps'}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check size={16} className={styles.itemCheckIcon} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Creators / Origins Dropdown Menu */}
          <div className={styles.dropdownWrapper}>
            <button
              type="button"
              className={`${styles.pill} ${styles.dropdownTrigger} ${
                activeOrigin || openMenu === 'origin' ? styles.active : ''
              }`}
              onClick={() => toggleMenu('origin')}
              aria-expanded={openMenu === 'origin'}
              aria-haspopup="true"
            >
              {isSilverByteActive ? (
                <Building2 size={15} />
              ) : isOtherDevsActive ? (
                <Users size={15} />
              ) : (
                <Building2 size={15} />
              )}
              <span className={styles.dropdownLabel}>
                {activeOrigin || 'Developers'}
              </span>
              <ChevronDown
                size={14}
                className={`${styles.chevron} ${
                  openMenu === 'origin' ? styles.chevronRotated : ''
                }`}
              />
            </button>

            {openMenu === 'origin' && (
              <div
                className={`${styles.menuPanel} ${styles.originMenu}`}
                role="menu"
                aria-label="Filter by Developer"
              >
                <div className={styles.menuHeader}>
                  <span className={styles.menuTitle}>Developer Origin</span>
                </div>

                <div className={styles.originList}>
                  <Link
                    href="/search?origin=SILVER_BYTE"
                    role="menuitem"
                    className={`${styles.originMenuItem} ${
                      isSilverByteActive ? styles.originMenuItemActive : ''
                    }`}
                    onClick={() => setOpenMenu(null)}
                  >
                    <div className={`${styles.menuIconBox} ${styles.originIconSilver}`}>
                      <Building2 size={16} color="#fff6e6" />
                    </div>
                    <div className={styles.menuItemDetails}>
                      <span className={styles.menuItemName}>Silver Byte Originals</span>
                      <span className={styles.menuItemCount}>Official first-party releases</span>
                    </div>
                    {isSilverByteActive && <Check size={16} className={styles.itemCheckIcon} />}
                  </Link>

                  <Link
                    href="/search?origin=OTHER"
                    role="menuitem"
                    className={`${styles.originMenuItem} ${
                      isOtherDevsActive ? styles.originMenuItemActive : ''
                    }`}
                    onClick={() => setOpenMenu(null)}
                  >
                    <div className={`${styles.menuIconBox} ${styles.originIconOther}`}>
                      <Users size={16} color="#fff6e6" />
                    </div>
                    <div className={styles.menuItemDetails}>
                      <span className={styles.menuItemName}>Other Developers</span>
                      <span className={styles.menuItemCount}>Independent creator showcase</span>
                    </div>
                    {isOtherDevsActive && <Check size={16} className={styles.itemCheckIcon} />}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className={styles.navDivider} />

          {/* Mod Apps & Enhanced Builds */}
          <Link
            href="/search?type=MOD"
            className={`${styles.pill} ${isModAppsActive ? styles.modActive : ''}`}
          >
            <Sparkles size={15} />
            <span>Mod Apps</span>
          </Link>
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
            <div className={styles.navRow} style={{ minHeight: 44 }} />
          </div>
        </nav>
      }
    >
      <CategoryNavContent categories={categories} />
    </Suspense>
  );
}

