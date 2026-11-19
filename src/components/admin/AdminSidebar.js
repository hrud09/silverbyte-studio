'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Smartphone,
  Layers,
  Share2,
  FolderTree,
  BarChart3,
  Settings,
  User,
  Globe,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import styles from './AdminSidebar.module.css';

export default function AdminSidebar({
  isCollapsed = false,
  onToggleCollapse = () => {},
  isMobileOpen = false,
  onCloseMobile = () => {},
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Studio Portfolio', href: '/admin/portfolio', icon: Globe },
    { label: 'Silver Red Store', href: '/admin/store', icon: LayoutDashboard },
    { label: 'All Apps', href: '/admin/apps', icon: Smartphone },
    { label: 'Releases', href: '/admin/releases', icon: Layers },
    { label: 'Quick Share', href: '/admin/share', icon: Share2 },
    { label: 'Categories', href: '/admin/categories', icon: FolderTree },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
    { label: 'Profile', href: '/admin/profile', icon: User },
  ];

  const isActive = (item) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of the admin console?')) {
      signOut({ callbackUrl: '/admin/login' });
    }
  };

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A';
  const userName = session?.user?.name || 'Administrator';
  const userRole = session?.user?.role || 'Admin';

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`${styles.backdrop} ${isMobileOpen ? styles.mobileOpen : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${
          isMobileOpen ? styles.mobileOpen : ''
        }`}
      >
        {/* Brand Header */}
        <div className={styles.brand}>
          <Link href="/admin" className={styles.brandLogo}>
            <div className={styles.logoIcon}>
              <img
                src="/logo.png"
                alt=""
                className={styles.logoImg}
              />
            </div>
            {!isCollapsed && (
              <div className={styles.brandText}>
                <span className={styles.brandTitle}>Silverbyte Studio</span>
                <span className={styles.brandBadge}>Console</span>
              </div>
            )}
          </Link>
          <button
            type="button"
            className={styles.collapseToggle}
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className={styles.navSection}>
          {!isCollapsed && <div className={styles.navSectionTitle}>Management</div>}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.active : ''}`}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={styles.navIcon}>
                  <Icon size={20} />
                </div>
                {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Footer & User Section */}
        <div className={styles.footerSection}>
          {/* User profile info */}
          {!isCollapsed && (
            <div className={styles.userCard}>
              <div className={styles.userAvatar}>{userInitial}</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userRole}>{userRole}</span>
              </div>
            </div>
          )}

          {/* Quick link to Storefront */}
          <Link
            href="/appstore"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionButton}
            title={isCollapsed ? 'View Storefront' : undefined}
          >
            <ExternalLink size={18} />
            {!isCollapsed && <span>View Store</span>}
          </Link>

          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            className={`${styles.actionButton} ${styles.logout}`}
            title={isCollapsed ? 'Log Out' : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
