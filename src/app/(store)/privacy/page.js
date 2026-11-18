import prisma from '@/lib/db';
import Link from 'next/link';
import { ShieldCheck, ChevronRight, Lock } from 'lucide-react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Privacy Policy | Silver Red Store',
  description: 'Learn how Silver Byte Studios and Silver Red Store handle and protect your personal privacy and data.',
};

export default async function PrivacyPolicyPage() {
  let policyText = '';

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'privacy_policy' },
    });
    policyText = setting ? setting.value : '';
  } catch (err) {
    console.error('Error loading privacy policy:', err);
  }

  const defaultPolicy = `At Silver Byte Studios and Silver Red Store, we believe that privacy is a fundamental human right. Our software and app store are designed from the ground up to minimize data collection and respect your device integrity.

### 1. Information We Collect
• **Direct App Downloads:** When you download an app or update through Silver Red Store, we record non-personally identifiable telemetry such as the version downloaded, operating system version, and timestamp to generate overall download statistics.
• **No User Profiling:** We do not track individual users across apps or sell behavioral profiles to advertising networks.

### 2. Device Permissions
Our apps only request permissions that are strictly necessary for core functionality (for example, storage access for SB File Manager or microphone access for SB Chat). We never use permissions for stealth background data harvesting.

### 3. Third-Party Sharing
We do not sell, rent, or trade your data to third parties. We run clean, ad-free applications without commercial surveillance SDKs.

### 4. Contact Us
If you have any questions or feedback regarding our privacy practices, please contact us at **privacy@silverbytestudios.com**.`;

  const finalContent = policyText && policyText.trim().length > 100 ? policyText : defaultPolicy;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Breadcrumbs */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/appstore" className={styles.crumbLink}>Store</Link>
          <ChevronRight size={14} className={styles.crumbSep} />
          <span className={styles.crumbActive}>Privacy Policy</span>
        </nav>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.iconBadge}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className={styles.title}>Privacy Policy</h1>
              <p className={styles.subtitle}>Last updated: August 2026 • Silver Byte Studios</p>
            </div>
          </div>

          <div className={styles.content}>
            {finalContent.split('\n').map((paragraph, index) => {
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={index} className={styles.sectionHeading}>
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              if (paragraph.startsWith('• ')) {
                return (
                  <p key={index} className={styles.bullet}>
                    {paragraph}
                  </p>
                );
              }
              if (!paragraph.trim()) {
                return <br key={index} />;
              }
              return (
                <p key={index} className={styles.paragraph}>
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
