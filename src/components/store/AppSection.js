'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Clock,
  Flame,
  Layers,
  Star,
  Gamepad2,
  BarChart3,
  Wrench,
  Grid,
  Building2,
  Users,
} from 'lucide-react';
import AppCard from './AppCard';
import styles from './AppSection.module.css';

const TONE_MAP = {
  red: 'toneRed',
  indigo: 'toneIndigo',
  amber: 'toneAmber',
  teal: 'toneTeal',
  plain: 'tonePlain',
};

const ICON_MAP = {
  Sparkles,
  Clock,
  Flame,
  Layers,
  Star,
  Gamepad2,
  BarChart3,
  Wrench,
  Grid,
  Building2,
  Users,
};

export default function AppSection({
  title,
  subtitle,
  apps = [],
  seeAllHref,
  layout = 'shelf', // 'shelf' (horizontal scroll) | 'grid' (2-4 col grid)
  iconName,
  icon: DirectIcon,
  tone = 'plain', // background treatment: red | indigo | amber | teal | plain
}) {
  const scrollRef = useRef(null);
  const Icon = (iconName && ICON_MAP[iconName]) || DirectIcon;
  const toneClass = styles[TONE_MAP[tone] || TONE_MAP.plain];

  if (!apps || apps.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const distance = 400;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  return (
    <section className={`gx-nails ${styles.section} ${toneClass}`}>
      {/* Section Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.mainTitleRow}>
            {Icon && (
              <span className={styles.iconChip}>
                <Icon size={18} />
              </span>
            )}
            <h2 className={styles.title}>{title}</h2>
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        <div className={styles.headerActions}>
          {seeAllHref && (
            <Link href={seeAllHref} className={styles.seeAllLink}>
              <span>See all</span>
              <ArrowRight size={14} />
            </Link>
          )}

          {layout === 'shelf' && apps.length > 3 && (
            <div className={styles.scrollButtons}>
              <button
                type="button"
                onClick={() => scroll('left')}
                className={styles.arrowBtn}
                aria-label="Scroll left"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className={styles.arrowBtn}
                aria-label="Scroll right"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* App Content */}
      {layout === 'shelf' ? (
        <div className={styles.shelfWrapper}>
          <div className={styles.shelf} ref={scrollRef}>
            {apps.map((app) => (
              <div key={app.id} className={styles.shelfItem}>
                <AppCard app={app} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </section>
  );
}
