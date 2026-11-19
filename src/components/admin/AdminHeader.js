'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Menu,
  Search,
  Plus,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Download,
  TrendingUp,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import styles from './AdminHeader.module.css';

export default function AdminHeader({
  onToggleMobile = () => {},
  title,
  breadcrumbs = [],
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(true);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent system events for notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/stats');
        const json = await res.json();
        if (json.success && json.data?.recentEvents) {
          setNotifications(json.data.recentEvents.slice(0, 5));
        }
      } catch {
        // Silently keep default
      }
    }
    loadNotifications();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/apps?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setHasUnread(false);
    }
  };

  // Generate automatic breadcrumbs if not explicitly passed
  const getBreadcrumbs = () => {
    if (breadcrumbs && breadcrumbs.length > 0) return breadcrumbs;

    const segments = pathname.replace('/admin', '').split('/').filter(Boolean);
    if (segments.length === 0) {
      return [{ label: 'Console Dashboard' }];
    }

    const items = [{ label: 'Dashboard', href: '/admin' }];
    let pathAcc = '/admin';

    segments.forEach((seg, index) => {
      pathAcc += `/${seg}`;
      const isLast = index === segments.length - 1;
      const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
      items.push({
        label: formatted,
        href: isLast ? undefined : pathAcc,
      });
    });

    return items;
  };

  const activeBreadcrumbs = getBreadcrumbs();
  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A';
  const userName = session?.user?.name || 'Administrator';
  const userEmail = session?.user?.email || 'admin@silverbytestudios.com';

  return (
    <header className={styles.header}>
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className={styles.leftSection}>
        <button
          type="button"
          className={styles.mobileMenuToggle}
          onClick={onToggleMobile}
          aria-label="Open sidebar menu"
        >
          <Menu size={20} />
        </button>

        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          {activeBreadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className={styles.breadcrumbSep}>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className={styles.breadcrumbLink}>
                  {crumb.label}
                </Link>
              ) : (
                <span className={styles.breadcrumbCurrent}>{title || crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Search, Quick Action, Notifications, User Profile */}
      <div className={styles.rightSection}>
        {/* Global Search Input */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search apps, releases..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Quick New App Action */}
        <Link href="/admin/apps/new" className={styles.newAppBtn} title="Create new application">
          <Plus size={16} />
          <span>New App</span>
        </Link>

        {/* Notification Bell */}
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleToggleNotifications}
            aria-label="Notifications"
            title="System events & activity"
          >
            <Bell size={18} />
            {hasUnread && <span className={styles.notificationBadge} />}
          </button>

          {showNotifications && (
            <div className={styles.userDropdown} style={{ width: '320px', padding: 0 }}>
              <div className={styles.dropdownHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.dropdownUserName}>Recent Activity</span>
                <Link href="/admin/analytics" style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }} onClick={() => setShowNotifications(false)}>
                  View All
                </Link>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--color-divider)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: ev.type === 'DOWNLOAD' ? 'var(--color-success-bg)' : 'var(--color-info-bg)',
                          color: ev.type === 'DOWNLOAD' ? 'var(--color-success)' : 'var(--color-info)',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {ev.type === 'DOWNLOAD' ? <Download size={13} /> : <TrendingUp size={13} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                          <strong>{ev.app?.name || 'Store'}</strong> {ev.type === 'DOWNLOAD' ? 'download started' : 'page viewed'}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          {formatRelativeTime(ev.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    All services operational. No new alerts.
                  </div>
                )}
              </div>

              <div style={{ padding: '8px 14px', backgroundColor: 'var(--color-gray-50)', borderTop: '1px solid var(--color-divider)', fontSize: '0.75rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                System online • Edge CDN active
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div ref={userMenuRef} className={styles.userMenuContainer}>
          <button
            type="button"
            className={styles.userBtn}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
          >
            <div className={styles.userAvatar}>{userInitial}</div>
            <span className={styles.userDisplayName}>{userName}</span>
            <ChevronDown size={14} color="var(--color-text-secondary)" />
          </button>

          {showUserMenu && (
            <div className={styles.userDropdown}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownUserName}>{userName}</div>
                <div className={styles.dropdownUserEmail}>{userEmail}</div>
              </div>

              <Link
                href="/admin/profile"
                className={styles.dropdownItem}
                onClick={() => setShowUserMenu(false)}
              >
                <User size={16} />
                <span>Profile</span>
              </Link>

              <Link
                href="/admin/settings"
                className={styles.dropdownItem}
                onClick={() => setShowUserMenu(false)}
              >
                <Settings size={16} />
                <span>Platform Settings</span>
              </Link>

              <Link
                href="/appstore"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.dropdownItem}
                onClick={() => setShowUserMenu(false)}
              >
                <ExternalLink size={16} />
                <span>View Storefront</span>
              </Link>

              <div style={{ height: 1, backgroundColor: 'var(--color-divider)', margin: '4px 0' }} />

              <button
                type="button"
                className={`${styles.dropdownItem} ${styles.danger}`}
                onClick={() => signOut({ callbackUrl: '/admin/login' })}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
