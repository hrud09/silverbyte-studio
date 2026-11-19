import prisma from '@/lib/db';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import styles from '../privacy/page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Terms of Service | Silver Red Store',
  description: 'Review the terms and conditions for using Silver Red Store and Silver Byte Studios software.',
};

export default async function TermsOfServicePage() {
  let termsText = '';

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'terms_of_service' },
    });
    termsText = setting ? setting.value : '';
  } catch (err) {
    console.error('Error loading terms of service:', err);
  }

  const defaultTerms = `Welcome to Silver Red Store! By accessing or downloading software from this platform, you agree to comply with and be bound by the following terms and conditions.

### 1. License & Usage
All software distributed through Silver Red Store is the intellectual property of Silver Byte Studios. You are granted a personal, non-exclusive, non-transferable license to install and run the applications on your personal devices.

### 2. Restrictions
You agree not to:
• Reverse engineer, decompile, or disassemble any binary packages unless permitted by applicable law.
• Re-distribute modified APK packages or commercially resell applications without express written consent from Silver Byte Studios.
• Use our software in any unlawful manner or for unauthorized malicious purposes.

### 3. Updates & Maintenance
Silver Byte Studios periodically releases updates, new features, and security patches. We reserve the right to modify or discontinue any specific application or feature at our discretion.

### 4. Disclaimer of Warranties
Software is provided "as is" and "as available" without warranty of any kind, either express or implied.

### 5. Contact Information
For legal inquiries or permission requests, please contact **legal@silverbytestudios.com**.`;

  const finalContent = termsText && termsText.trim().length > 100 ? termsText : defaultTerms;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Breadcrumbs */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            <li className="breadcrumb-item"><Link href="/appstore">App Store</Link></li>
            <li className="breadcrumb-separator" aria-hidden="true">/</li>
            <li className="breadcrumb-item current" aria-current="page">Terms of Service</li>
          </ol>
        </nav>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.iconBadge}>
              <FileText size={28} />
            </div>
            <div>
              <h1 className={styles.title}>Terms of Service</h1>
              <p className={styles.subtitle}>Effective Date: August 2026 • Silver Byte Studios</p>
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
