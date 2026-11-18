'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import styles from './ScreenshotGallery.module.css';

export default function ScreenshotGallery({ screenshots = [], appName = 'App' }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  if (!screenshots || screenshots.length === 0) return null;

  const openLightbox = (index) => setSelectedIdx(index);
  const closeLightbox = () => setSelectedIdx(null);

  const prevImage = (e) => {
    e?.stopPropagation();
    setSelectedIdx((prev) => (prev > 0 ? prev - 1 : screenshots.length - 1));
  };

  const nextImage = (e) => {
    e?.stopPropagation();
    setSelectedIdx((prev) => (prev < screenshots.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.galleryHeading}>Screenshots & Previews</h3>

      {/* Horizontal Screenshot Scroll */}
      <div className={styles.scrollList}>
        {screenshots.map((s, index) => (
          <div
            key={s.id || index}
            className={styles.thumbnailWrapper}
            onClick={() => openLightbox(index)}
            tabIndex={0}
            role="button"
            aria-label={`View screenshot ${index + 1}`}
          >
            <img
              src={s.url || `/api/placeholder/screenshot/${appName.toLowerCase().replace(/\s+/g, '-')}/${index}`}
              alt={`${appName} screenshot ${index + 1}`}
              className={styles.thumbnailImg}
              onError={(e) => {
                e.currentTarget.src = `/api/placeholder/screenshot/${appName.toLowerCase().replace(/\s+/g, '-')}/${index}`;
              }}
            />
            <div className={styles.zoomOverlay}>
              <Maximize2 size={20} className={styles.zoomIcon} />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Preview Modal */}
      {selectedIdx !== null && (
        <div className={styles.lightboxBackdrop} onClick={closeLightbox}>
          <button
            type="button"
            className={styles.lightboxCloseBtn}
            onClick={closeLightbox}
            aria-label="Close screenshot preview"
          >
            <X size={24} />
          </button>

          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            {screenshots.length > 1 && (
              <button
                type="button"
                className={`${styles.lightboxNavBtn} ${styles.lightboxPrev}`}
                onClick={prevImage}
                aria-label="Previous screenshot"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <img
              src={
                screenshots[selectedIdx]?.url ||
                `/api/placeholder/screenshot/${appName.toLowerCase().replace(/\s+/g, '-')}/${selectedIdx}`
              }
              alt={`${appName} preview`}
              className={styles.lightboxImg}
              onError={(e) => {
                e.currentTarget.src = `/api/placeholder/screenshot/${appName.toLowerCase().replace(/\s+/g, '-')}/${selectedIdx}`;
              }}
            />

            {screenshots.length > 1 && (
              <button
                type="button"
                className={`${styles.lightboxNavBtn} ${styles.lightboxNext}`}
                onClick={nextImage}
                aria-label="Next screenshot"
              >
                <ChevronRight size={28} />
              </button>
            )}

            <div className={styles.counter}>
              {selectedIdx + 1} / {screenshots.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
