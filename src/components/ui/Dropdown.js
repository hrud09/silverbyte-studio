'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './Dropdown.module.css';

export default function Dropdown({
  trigger,
  items = [], // Array of { label, onClick, icon: Icon, danger: boolean, divider: boolean }
  align = 'right', // 'left' | 'right'
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`${styles.dropdown} ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className={styles.triggerWrapper}>
        {trigger}
      </div>

      {isOpen && (
        <div className={`${styles.menu} ${align === 'left' ? styles.alignLeft : styles.alignRight}`}>
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={`div-${index}`} className={styles.divider} />;
            }

            const Icon = item.icon;
            return (
              <button
                key={index}
                className={`${styles.item} ${item.danger ? styles.danger : ''}`}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
              >
                {Icon && <Icon size={16} className={styles.itemIcon} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
