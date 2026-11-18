import React from 'react';
import { PackageOpen } from 'lucide-react';
import styles from './EmptyState.module.css';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'There are no items matching your criteria at this time.',
  action,
  className = '',
}) {
  return (
    <div className={`${styles.emptyState} ${className}`}>
      <div className={styles.iconWrapper}>
        <Icon size={36} className={styles.icon} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
