'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import styles from './StatCard.module.css';

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconBg = 'rgba(211, 47, 47, 0.1)',
  iconColor = '#D32F2F',
  trend, // e.g. "+12.5%" or -4.2
  trendDirection, // 'up' | 'down' | 'neutral'
  trendLabel = 'vs last period',
  footerExtra,
}) {
  const isPositive = trendDirection === 'up' || (typeof trend === 'string' && trend.startsWith('+'));
  const isNegative = trendDirection === 'down' || (typeof trend === 'string' && trend.startsWith('-'));

  let badgeClass = styles.trendNeutral;
  let TrendIcon = Minus;

  if (isPositive) {
    badgeClass = styles.trendPositive;
    TrendIcon = ArrowUpRight;
  } else if (isNegative) {
    badgeClass = styles.trendNegative;
    TrendIcon = ArrowDownRight;
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {Icon && (
          <div className={styles.iconWrapper} style={{ backgroundColor: iconBg, color: iconColor }}>
            <Icon size={22} />
          </div>
        )}
      </div>

      <div className={styles.valueContainer}>
        <span className={styles.value}>{value}</span>
      </div>

      <div className={styles.footer}>
        {trend && (
          <span className={`${styles.trendBadge} ${badgeClass}`}>
            <TrendIcon size={12} />
            {trend}
          </span>
        )}
        <span className={styles.footerText}>{trendLabel}</span>
        {footerExtra && <span>• {footerExtra}</span>}
      </div>
    </div>
  );
}
