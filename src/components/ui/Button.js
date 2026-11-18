'use client';

import React from 'react';
import styles from './Button.module.css';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size = 'md',        // 'sm' | 'md' | 'lg' | 'icon'
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left', // 'left' | 'right'
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const variantClass = styles[variant] || styles.primary;
  const sizeClass = styles[size] || styles.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${styles.button} ${variantClass} ${sizeClass} ${loading ? styles.loading : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner} aria-label="Loading..." />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className={styles.icon} size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
          {children && <span>{children}</span>}
          {Icon && iconPosition === 'right' && <Icon className={styles.icon} size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
        </>
      )}
    </button>
  );
}
