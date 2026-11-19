'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Download,
  Layers,
  HardDrive,
  Plus,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  Activity,
  Zap,
  Share2,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import {
  DailyDownloadsChart,
  CategoryDistributionChart,
  TopAppsBarChart,
} from '@/components/admin/Charts';
import QuickUploadModal from '@/components/admin/QuickUploadModal';
import QuickShareModal from '@/components/admin/QuickShareModal';
import { useToast } from '@/components/admin/ToastContext';
import { formatFileSize, formatNumber, formatRelativeTime, formatDate, getAppIconUrl } from '@/lib/utils';
import styles from '../dashboard.module.css';

export default function AdminDashboardOverview() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState(false);
  const [isQuickShareOpen, setIsQuickShareOpen] = useState(false);

  const fetchDashboardStats = useCallback(async (isManualRefresh = false) => {
    return fetch('/api/stats')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to fetch statistics');
        setData(json.data);
        setError('');
        if (isManualRefresh) toast.success('Dashboard metrics refreshed');
      })
      .catch((err) => {
        setError(err.message || 'Error loading dashboard');
        if (isManualRefresh) toast.error('Failed to refresh data');
      })
      .finally(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      });
  }, [toast]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (isLoading && !data) {
    return (
      <div className={styles.dashboard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="skeleton" style={{ width: 220, height: 28, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 340, height: 16 }} />
          </div>
          <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 8 }} />
        </div>

        <div className={styles.kpiGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />
          ))}
        </div>

        <div className={styles.chartsGrid}>
          <div className="skeleton" style={{ height: 340, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 340, borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="empty-state">
        <Activity size={48} className="empty-state-icon" style={{ color: 'var(--color-danger)' }} />
        <h3 className="empty-state-title">Unable to Load Overview</h3>
        <p className="empty-state-desc">{error || 'Please check your connection and try again.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => { setIsLoading(true); fetchDashboardStats(false); }}>
          Retry Loading
        </button>
      </div>
    );
  }

  const { stats, dailyTrend, topApps, recentReleases, recentEvents, categories } = data;

  return (
    <div className={styles.dashboard}>
      {/* Welcome Banner & High-Impact Action Bar */}
      <div className={styles.welcomeSection}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className={styles.welcomeTitle}>Silver Red Store</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-success)',
                backgroundColor: 'var(--color-success-bg)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <CheckCircle2 size={12} />
              <span>Live Cloud</span>
            </span>
          </div>
          <p className={styles.welcomeSubtitle}>
            Real-time analytics and distribution telemetry for Silver Byte Studios
          </p>
        </div>

        <div className={styles.quickActions}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setIsRefreshing(true); fetchDashboardStats(true); }}
            disabled={isRefreshing}
            title="Refresh metrics immediately"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsQuickShareOpen(true)}
            title="Create direct share link"
          >
            <Share2 size={14} />
            <span>Quick Share</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsQuickUploadOpen(true)}
            title="Fast publish: name + icon + APK"
          >
            <Zap size={14} />
            <span>Quick Upload</span>
          </button>

          <Link href="/admin/apps/new" className="btn btn-primary btn-sm">
            <Plus size={15} />
            <span>New App</span>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className={styles.kpiGrid}>
        <StatCard
          title="Total Applications"
          value={stats.totalApps}
          icon={Smartphone}
          iconBg="rgba(211, 47, 47, 0.1)"
          iconColor="#D32F2F"
          trend={`${stats.publishedApps} Live`}
          trendDirection={stats.totalApps > 0 ? "up" : "neutral"}
          trendLabel={`${stats.publishedApps} Published • ${stats.draftApps} Draft`}
        />

        <StatCard
          title="Total Downloads"
          value={formatNumber(stats.totalDownloads)}
          icon={Download}
          iconBg="rgba(46, 125, 50, 0.1)"
          iconColor="#2E7D32"
          trend={stats.totalDownloads > 0 ? "+100%" : "0"}
          trendDirection={stats.totalDownloads > 0 ? "up" : "neutral"}
          trendLabel="All-time downloads"
          footerExtra={`${formatNumber(stats.totalPageViews)} total views`}
        />

        <StatCard
          title="Active Releases"
          value={stats.publishedReleases}
          icon={Layers}
          iconBg="rgba(21, 101, 192, 0.1)"
          iconColor="#1565C0"
          trend={`${stats.totalReleases} total`}
          trendDirection="neutral"
          trendLabel="across Android / Web"
        />

        <StatCard
          title="Storage Allocated"
          value={formatFileSize(stats.totalStorageBytes)}
          icon={HardDrive}
          iconBg="rgba(245, 127, 23, 0.1)"
          iconColor="#F57F17"
          trend="Optimal"
          trendDirection="up"
          trendLabel="APK binaries & assets"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className={styles.chartsGrid}>
        <DailyDownloadsChart
          title="Daily Downloads & Views (30 Days)"
          subtitle="Track engagement conversion rates"
          data={dailyTrend}
        />

        <CategoryDistributionChart
          title="Categories Distribution"
          categories={categories}
        />
      </div>

      {/* Top Performing Apps Bar Chart */}
      <TopAppsBarChart
        title="Top 5 Performing Applications"
        apps={topApps}
      />

      {/* Two Column Layout: Recent Releases & Real-time Activity */}
      <div className={styles.twoColumnGrid}>
        {/* Recent Releases Table */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Recent Releases</h3>
            <Link href="/admin/releases" className={styles.cardActionLink}>
              <span>View all releases</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>App</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentReleases && recentReleases.length > 0 ? (
                  recentReleases.map((rel) => {
                    const iconUrl = getAppIconUrl(rel.app);
                    return (
                      <tr key={rel.id}>
                        <td>
                          <div className={styles.appCell}>
                            <img
                              src={iconUrl}
                              alt={rel.app?.name || 'App'}
                              className={styles.appIcon}
                              onError={(e) => {
                                e.currentTarget.src = `/api/placeholder/icon/${rel.app?.slug || 'app'}`;
                              }}
                            />
                            <div>
                              <div className={styles.appName}>{rel.app?.name}</div>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
                                {rel.platform || 'Android'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>v{rel.versionName}</td>
                        <td>
                          <span
                            className={`badge ${
                              rel.status === 'PUBLISHED'
                                ? 'badge-success'
                                : rel.status === 'DRAFT'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                          >
                            {rel.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                          {formatDate(rel.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                      No recent releases found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Activity Stream */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Live Event Activity</h3>
            <Link href="/admin/analytics" className={styles.cardActionLink}>
              <span>Analytics</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.activityList}>
            {recentEvents && recentEvents.length > 0 ? (
              recentEvents.map((event) => {
                const isDownload = event.type === 'DOWNLOAD';
                return (
                  <div key={event.id} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${isDownload ? styles.download : styles.view}`}>
                      {isDownload ? <Download size={16} /> : <TrendingUp size={16} />}
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityText}>
                        <strong>{event.app?.name || 'Storefront'}</strong>{' '}
                        {isDownload ? 'download initiated' : 'store page viewed'}
                      </div>
                      <div className={styles.activityTime}>{formatRelativeTime(event.createdAt)}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No recent activity events recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Upload Modal */}
      <QuickUploadModal
        isOpen={isQuickUploadOpen}
        onClose={() => setIsQuickUploadOpen(false)}
        onSuccess={() => fetchDashboardStats(false)}
      />

      {/* Quick Share Modal */}
      <QuickShareModal
        isOpen={isQuickShareOpen}
        onClose={() => setIsQuickShareOpen(false)}
        onSuccess={() => fetchDashboardStats(false)}
      />
    </div>
  );
}
