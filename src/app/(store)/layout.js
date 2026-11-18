import { Suspense } from 'react';
import prisma from '@/lib/db';
import StoreHeader from '@/components/store/StoreHeader';
import CategoryNav from '@/components/store/CategoryNav';
import StoreFooter from '@/components/store/StoreFooter';
import { ToastProvider } from '@/components/ui/Toast';
import styles from './layout.module.css';

export const revalidate = 5;

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

  return (
    <ToastProvider>
      <div className={styles.storeShell}>
        <StoreHeader />
        <Suspense fallback={<div style={{ minHeight: 48 }} />}>
          <CategoryNav categories={categories} />
        </Suspense>
        <main className={styles.mainContent}>{children}</main>
        <StoreFooter />
      </div>
    </ToastProvider>
  );
}
