'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/admin/ToastContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import styles from './adminLayout.module.css';

export default function AdminLayoutClient({ children }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Do not wrap login page with admin shell (sidebar/header)
  if (pathname === '/admin/login') {
    return (
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <ToastProvider>
        <div className={styles.adminShell}>
          <AdminSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          <div
            className={`${styles.mainArea} ${
              isSidebarCollapsed ? styles.collapsed : ''
            }`}
          >
            <AdminHeader
              onToggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
            <main className={styles.contentContainer}>{children}</main>
          </div>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
