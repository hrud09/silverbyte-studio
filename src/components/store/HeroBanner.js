'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAppIconUrl, getAppFeatureUrl } from '@/lib/utils';
import styles from './HeroBanner.module.css';

export default function HeroBanner({ featuredApps = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!featuredApps || featuredApps.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredApps.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredApps]);

  if (!featuredApps || featuredApps.length === 0) {
    return null;
  }

  const currentApp = featuredApps[currentIndex];
  const featureUrl = getAppFeatureUrl(currentApp);
  const iconUrl = getAppIconUrl(currentApp);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredApps.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredApps.length) % featuredApps.length);
  };

  return (
    <div className={styles.heroSection}>
      <div className={styles.carouselContainer}>
        {/* Main Banner Card */}
        <div className={styles.bannerCard}>
          {/* Blurred copy of the graphic — fills any letterboxing left over when
              the 1024x500 feature image is contained instead of cropped */}
          <div
            className={styles.backdropFill}
            style={{ backgroundImage: `url(${featureUrl})` }}
          />

          {/* Background Feature Graphic with Gradient Overlay */}
          <div
            className={styles.backdropImage}
            style={{ backgroundImage: `url(${featureUrl})` }}
          >
            <div className={styles.backdropOverlay} />
          </div>

          {/* Blurred copy of the lower band of the artwork, masked so it fades
              in exactly where the icon, name and buttons sit */}
          <div
            className={styles.backdropBlurBand}
            style={{ backgroundImage: `url(${featureUrl})` }}
            aria-hidden="true"
          />

          {/* Frosted scrim so the icon/title/actions stay readable over artwork */}
          <div className={styles.contentScrim} aria-hidden="true" />

          {/* Content Info */}
          <div className={styles.content}>
            <div className={styles.appHeader}>
              <img
                src={iconUrl}
                alt={currentApp.name}
                className={styles.appIcon}
                onError={(e) => {
                  e.currentTarget.src = `/api/placeholder/icon/${currentApp.slug}`;
                }}
              />
              <div className={styles.titleArea}>
                <h1 className={styles.appName}>{currentApp.name}</h1>
                {currentApp.category?.name && (
                  <span className={styles.heroTag}>{currentApp.category.name}</span>
                )}
                <p className={styles.appDeveloper}>
                  {currentApp.developerName || 'Silver Byte Studios'}
                </p>
              </div>
            </div>

            <p className={styles.shortDesc}>{currentApp.shortDescription}</p>

            <div className={styles.actionsRow}>
              <Link href={`/apps/${currentApp.slug}`} className={`gx-btn gx-btn-red ${styles.installBtn}`}>
                <Download size={18} />
                <span>Install App</span>
              </Link>
              <Link href={`/apps/${currentApp.slug}`} className={`gx-btn gx-btn-wood ${styles.detailsBtn}`}>
                <span>Learn More</span>
              </Link>
            </div>
          </div>

          {/* Navigation Controls */}
          {featuredApps.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                className={`${styles.navBtn} ${styles.prevBtn}`}
                aria-label="Previous featured app"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className={`${styles.navBtn} ${styles.nextBtn}`}
                aria-label="Next featured app"
              >
                <ChevronRight size={22} />
              </button>

              {/* Dots indicator */}
              <div className={styles.dotsContainer}>
                {featuredApps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`${styles.dot} ${idx === currentIndex ? styles.activeDot : ''}`}
                    aria-label={`Slide ${idx + 1}`}
                    aria-current={idx === currentIndex ? 'true' : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
