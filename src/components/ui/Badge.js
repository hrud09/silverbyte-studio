import React from 'react';
import styles from './Badge.module.css';

export default function Badge({
  children,
  variant = 'neutral', // 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size = 'md',        // 'sm' | 'md'
  icon: Icon,
  className = '',
  ...props
}) {
  const variantClass = styles[variant] || styles.neutral;
  const sizeClass = styles[size] || styles.md;

  return (
    <span className={`${styles.badge} ${variantClass} ${sizeClass} ${className}`} {...props}>
      {Icon && <Icon className={styles.icon} size={size === 'sm' ? 10 : 12} />}
      <span>{children}</span>
    </span>
  );
}
