import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Heart, ExternalLink } from 'lucide-react';
import styles from './StoreFooter.module.css';

export default function StoreFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.topSection}>
          {/* Brand & Attribution */}
          <div className={styles.brandCol}>
            <div className={styles.brandLogo}>
              <div className={styles.logoBadge}>
                <img
                  src="/logo.png"
                  alt="Silver Red Store"
                  className={styles.logoImg}
                />
              </div>
              <span className={styles.brandTitle}>Silver Red Store</span>
            </div>
            <p className={styles.brandDesc}>
              A personal Apps and Games store by Silver Byte Studios.
            </p>
            <div className={styles.attribution}>
              <span>Crafted with</span>
              <Heart size={14} className={styles.heartIcon} fill="currentColor" />
              <span>by <strong>Silver Byte Studios</strong></span>
            </div>
          </div>

          {/* Quick Categories */}
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Categories</h4>
            <ul className={styles.linkList}>
              <li><Link href="/category/games">Games</Link></li>
              <li><Link href="/category/productivity">Productivity</Link></li>
              <li><Link href="/category/utilities">Utilities</Link></li>
              <li><Link href="/category/tools">Tools</Link></li>
              <li><Link href="/category/lifestyle">Lifestyle</Link></li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Trust & Legal</h4>
            <ul className={styles.linkList}>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/store-terms">Terms of Service</Link></li>
              <li>
                <span className={styles.badgeShield}>
                  <ShieldCheck size={13} />
                  <span>Direct from the developer</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Studio */}
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Studio</h4>
            <ul className={styles.linkList}>
              <li><Link href="/admin/login">Developer Sign In</Link></li>
              <li>
                <a
                  href="https://silverbytestudio.com"
                  className={styles.externalLink}
                >
                  <span>Silverbyte Studio</span>
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://silverbytestudio.com/business"
                  className={styles.externalLink}
                >
                  <span>Silverbyte Business</span>
                  <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            &copy; {currentYear} Silver Byte Studios. All rights reserved. Silver Red Store is an independent personal app distribution platform.
          </p>
          <div className={styles.bottomMeta}>
            <span>No account or sign-up required</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
