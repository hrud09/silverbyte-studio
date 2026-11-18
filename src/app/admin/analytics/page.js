'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  Eye,
  Percent,
  TrendingUp,
  Activity,
  Layers,
  Smartphone,
  Calendar,
  FileSpreadsheet,
  FileCode2,
  RefreshCw,
} from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import { DailyDownloadsChart } from '@/components/admin/Charts';
import { formatNumber, formatDate, formatRelativeTime } from '@/lib/utils';
import styles from './analytics.module.css';

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState('30d'); // '7d' | '30d' | '90d' | 'all'
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      else setIsLoading(true);

      const res = await fetch(`/api/analytics?range=${range}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCSV = () => {
    if (!data) return;

    // Build CSV content
    const headers = ['Date', 'Page Views', 'Downloads', 'Conversion Rate'];
    const rows = (data.timeline || []).map((t) => [
      t.date || t.day,
      t.views || t.pageViews || 0,
      t.downloads || 0,
      t.views > 0 ? `${((t.downloads / t.views) * 100).toFixed(1)}%` : '0%',
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';
    rows.forEach((rowArray) => {
      csvContent += rowArray.join(',') + '\n';
    });

    if (data.topApps && data.topApps.length > 0) {
      csvContent += '\n\nTop Performing Applications\n';
      csvContent += 'Rank,App Name,Slug,Category,Period Downloads,Total Downloads,Total Views,Conversion Rate\n';
      data.topApps.forEach((app, idx) => {
        csvContent += `"${idx + 1}","${app.name}","${app.slug}","${app.category || ''}",${app.periodDownloads || 0},${app.totalDownloads || 0},${app.totalViews || 0},"${app.conversionRate}%"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `red-apps-analytics-${range}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = data?.kpis || {
    periodDownloads: 0,
    periodViews: 0,
    conversionRate: '0%',
    totalApps: 0,
    totalDownloads: 0,
  };

  return (
    <div className={styles.container}>
      {/* Header with Timeframe Filter & Export */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics & Insights</h1>
          <p className={styles.subtitle}>
            Monitor store pageviews, conversion funnels, and app download velocity
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Range Selector */}
          <div className={styles.rangeButtons}>
            <button
              type="button"
              className={`${styles.rangeBtn} ${range === '7d' ? styles.active : ''}`}
              onClick={() => setRange('7d')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`${styles.rangeBtn} ${range === '30d' ? styles.active : ''}`}
              onClick={() => setRange('30d')}
            >
              30 Days
            </button>
            <button
              type="button"
              className={`${styles.rangeBtn} ${range === '90d' ? styles.active : ''}`}
              onClick={() => setRange('90d')}
            >
              90 Days
            </button>
            <button
              type="button"
              className={`${styles.rangeBtn} ${range === 'all' ? styles.active : ''}`}
              onClick={() => setRange('all')}
            >
              All Time
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCSV}
            disabled={!data || isLoading}
            title="Download CSV report"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <FileSpreadsheet size={15} color="var(--color-success)" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <StatCard
          title="Period Downloads"
          value={formatNumber(kpis.periodDownloads)}
          icon={Download}
          iconBg="rgba(211, 47, 47, 0.1)"
          iconColor="#D32F2F"
          trendLabel={`in selected ${range} window`}
        />

        <StatCard
          title="Period Page Views"
          value={formatNumber(kpis.periodViews)}
          icon={Eye}
          iconBg="rgba(25, 118, 210, 0.1)"
          iconColor="#1976D2"
          trendLabel="Unique catalog views"
        />

        <StatCard
          title="Conversion Rate"
          value={kpis.conversionRate}
          icon={Percent}
          iconBg="rgba(46, 125, 50, 0.1)"
          iconColor="#2E7D32"
          trendDirection="up"
          trendLabel="Views converted to installs"
        />

        <StatCard
          title="Total Lifetime Downloads"
          value={formatNumber(kpis.totalDownloads)}
          icon={TrendingUp}
          iconBg="rgba(245, 127, 23, 0.1)"
          iconColor="#F57F17"
          trendLabel={`across ${kpis.totalApps} published apps`}
        />
      </div>

      {/* Main Downloads & Views Chart */}
      <div className={styles.card}>
        <DailyDownloadsChart
          title={`Daily Downloads vs Page Views (${range.toUpperCase()})`}
          subtitle="Direct comparison between store engagement and build installations"
          data={data?.timeline || []}
        />
      </div>

      {/* Top Performing Apps Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Top Performing Apps</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Ranked by total download volume
          </span>
        </div>

        <div className={styles.tableContainer}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Application</th>
                <th>Category</th>
                <th>Period Downloads</th>
                <th>Total Downloads</th>
                <th>Total Views</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {data?.topApps && data.topApps.length > 0 ? (
                data.topApps.map((app, idx) => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 700, color: idx < 3 ? 'var(--color-primary)' : 'inherit' }}>
                      #{idx + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={`/api/placeholder/icon/${app.slug}`}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
                        />
                        <Link
                          href={`/admin/apps/${app.slug}/edit`}
                          style={{ fontWeight: 600, color: 'var(--color-text)' }}
                        >
                          {app.name}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <span className={styles.categoryColorDot} style={{ backgroundColor: app.categoryColor }} />
                      <span>{app.category}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {formatNumber(app.periodDownloads || 0)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatNumber(app.totalDownloads || 0)}</td>
                    <td>{formatNumber(app.totalViews || 0)}</td>
                    <td>
                      <span>{app.conversionRate}%</span>
                      <div className={styles.conversionBarTrack}>
                        <div
                          className={styles.conversionBarFill}
                          style={{ width: `${Math.min(parseFloat(app.conversionRate) || 0, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                    No app data available for this range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Category Breakdown</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Category install distribution
          </span>
        </div>

        <div className={styles.tableContainer}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>App Count</th>
                <th>Total Downloads</th>
                <th>Total Page Views</th>
                <th>Avg Conversion</th>
              </tr>
            </thead>
            <tbody>
              {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
                data.categoryBreakdown.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <span className={styles.categoryColorDot} style={{ backgroundColor: cat.color }} />
                      <strong style={{ color: 'var(--color-text)' }}>{cat.name}</strong>
                    </td>
                    <td>{cat.appCount} apps</td>
                    <td style={{ fontWeight: 600 }}>{formatNumber(cat.downloads)}</td>
                    <td>{formatNumber(cat.pageViews)}</td>
                    <td>{cat.conversionRate}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    No category data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Raw Analytics Events Stream */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Recent Raw Events Log</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
            Last 20 telemetry events
          </span>
        </div>

        <div className={styles.tableContainer}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Target App</th>
                <th>Timestamp</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentEvents && data.recentEvents.length > 0 ? (
                data.recentEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span
                        className={`badge ${
                          ev.type === 'DOWNLOAD' ? 'badge-success' : 'badge-info'
                        }`}
                      >
                        {ev.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {ev.app?.name ? (
                        <Link href={`/admin/apps/${ev.app.slug}/edit`}>{ev.app.name}</Link>
                      ) : (
                        'Storefront Home'
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {formatRelativeTime(ev.createdAt)}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      {formatDate(ev.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                    No telemetry events recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
