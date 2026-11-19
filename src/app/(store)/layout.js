import { Suspense } from 'react';
import prisma from '@/lib/db';
import StoreHeader from '@/components/store/StoreHeader';
import CategoryNav from '@/components/store/CategoryNav';
import { PortfolioFooter } from '@/components/store/PortfolioChrome';
import { getPortfolioChrome } from '@/lib/portfolioChrome';
import { ToastProvider } from '@/components/ui/Toast';
import styles from './layout.module.css';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }) {
  let categories = [];
  try {
    const rawCategories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            apps: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });
    // Hide categories that don't have any published apps
    categories = rawCategories.filter((cat) => (cat._count?.apps || 0) > 0);
  } catch (err) {
    console.error('Error fetching categories for store layout:', err);
  }

  const chrome = await getPortfolioChrome();

  return (
    <ToastProvider>
      {/* The portfolio's own stylesheet: shared tokens, sprite primitives and footer. */}
      <link rel="stylesheet" href="/assets/css/style.css" precedence="portfolio" />
      <div className={styles.storeShell}>
        <div className={styles.storeBar}>
          <StoreHeader />
          <Suspense fallback={<div style={{ minHeight: 48 }} />}>
            <CategoryNav categories={categories} />
          </Suspense>
        </div>
        <main className={styles.mainContent}>{children}</main>
        <PortfolioFooter html={chrome.footer} />
      </div>
    </ToastProvider>
  );
}
