'use client';

import React from 'react';
import styles from './Tabs.module.css';

export default function Tabs({
  tabs = [], // Array of { id, label, icon: Icon, badge: number|string }
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div className={`${styles.tabs} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon size={16} className={styles.icon} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className={`${styles.badge} ${isActive ? styles.badgeActive : ''}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
