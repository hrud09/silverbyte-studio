'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './AboutAppText.module.css';

export default function AboutAppText({ shortDescription, fullDescription }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>About this app</h3>
      <p className={styles.shortDesc}>{shortDescription}</p>

      {fullDescription && (
        <>
          <div className={`${styles.fullDesc} ${isExpanded ? styles.expanded : styles.collapsed}`}>
            <div className={styles.markdownBody}>
              {fullDescription.split('\n').map((line, idx) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return (
                    <h4 key={idx} className={styles.sectionHeader}>
                      {line.replace(/\*\*/g, '')}
                    </h4>
                  );
                }
                if (line.startsWith('•')) {
                  return (
                    <p key={idx} className={styles.bulletItem}>
                      {line}
                    </p>
                  );
                }
                if (!line.trim()) {
                  return <br key={idx} />;
                }
                return (
                  <p key={idx} className={styles.paragraph}>
                    {line}
                  </p>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.toggleBtn}
          >
            <span>{isExpanded ? 'Show less' : 'Read more'}</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </>
      )}
    </div>
  );
}
