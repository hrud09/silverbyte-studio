import React from 'react';
import styles from './Skeleton.module.css';

export default function Skeleton({
  variant = 'text', // 'text' | 'rectangular' | 'circular' | 'card'
  width,
  height,
  className = '',
  count = 1,
  style = {},
}) {
  const elements = Array.from({ length: count });

  return (
    <>
      {elements.map((_, i) => (
        <div
          key={i}
          className={`${styles.skeleton} ${styles[variant]} ${className}`}
          style={{
            width: width !== undefined ? width : undefined,
            height: height !== undefined ? height : undefined,
            ...style,
          }}
        />
      ))}
    </>
  );
}

export function AppCardSkeleton() {
  return (
    <div className={styles.appCardSkeleton}>
      <Skeleton variant="circular" width={64} height={64} />
      <div className={styles.appCardMeta}>
        <Skeleton variant="text" width="80%" height={16} />
        <Skeleton variant="text" width="50%" height={12} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
    </div>
  );
}
