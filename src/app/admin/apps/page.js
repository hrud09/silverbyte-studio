'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit,
  ExternalLink,
  Layers,
  Copy,
  Trash2,
  CheckCircle,
  Archive,
  Smartphone,
  Eye,
  AlertCircle,
  Zap,
  FlaskConical,
  Globe,
  Share2,
  Download,
} from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import ReleaseFormModal from '@/components/admin/ReleaseFormModal';
import QuickUploadModal from '@/components/admin/QuickUploadModal';
import { useToast } from '@/components/admin/ToastContext';
import { formatNumber, getAppIconUrl } from '@/lib/utils';
import styles from './apps.module.css';

export default function AdminAppsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDevType, setSelectedDevType] = useState('ALL'); // 'ALL' | 'SILVER_BYTE' | 'OTHER'
  const [selectedAppType, setSelectedAppType] = useState('ALL'); // 'ALL' | 'NORMAL' | 'MOD'
  const [quickReleaseApp, setQuickReleaseApp] = useState(null);
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState(false);

  // Fetch apps & categories
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [appsRes, catRes] = await Promise.all([
        fetch('/api/apps?status=ALL&limit=100'),
        fetch('/api/categories'),
      ]);

      const appsJson = await appsRes.json();
      const catJson = await catRes.json();

      if (appsJson.success) {
        setApps(appsJson.data.apps || []);
      }
      if (catJson.success) {
        setCategories(catJson.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tab counts
  const publishedCount = apps.filter((a) => a.status === 'PUBLISHED').length;
  const draftCount = apps.filter((a) => a.status === 'DRAFT').length;
  const archivedCount = apps.filter((a) => a.status === 'ARCHIVED').length;

  // Filter apps
  const filteredApps = apps.filter((app) => {
    if (selectedTab !== 'ALL' && app.status !== selectedTab) return false;
    if (selectedCategory && app.categoryId !== selectedCategory && app.category?.slug !== selectedCategory) {
      return false;
    }
    if (selectedDevType !== 'ALL' && (app.developerType || 'SILVER_BYTE') !== selectedDevType) {
      return false;
    }
    if (selectedAppType !== 'ALL' && (app.appType || 'NORMAL') !== selectedAppType) {
      return false;
    }
    return true;
  });

  // Action handlers
  const handleTogglePublish = async (app) => {
    const nextStatus = app.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/apps/${app.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      toast.success(`App "${app.name}" is now ${nextStatus}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const handleDuplicate = async (app) => {
    const newName = `${app.name} (Copy)`;
    const newSlug = `${app.slug}-copy-${Math.floor(Math.random() * 1000)}`;
    const newPackage = `${app.packageId}.copy${Math.floor(Math.random() * 1000)}`;

    if (
      !window.confirm(
        `Duplicate "${app.name}" as a new draft?\n\nName: ${newName}\nSlug: ${newSlug}\nPackage ID: ${newPackage}\n\n` +
          `Icon, screenshots, and releases are copied too (as drafts) — you can rename anything afterward.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/apps/${app.slug}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          slug: newSlug,
          packageId: newPackage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to duplicate app');

      toast.success(`Duplicated "${app.name}" as draft!`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Duplicate failed');
    }
  };

  const handleDelete = async (app) => {
    if (!window.confirm(`Are you sure you want to delete "${app.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/apps/${app.slug}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete app');

      toast.success(`App "${app.name}" deleted successfully`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleBulkDelete = async (selectedIds) => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} apps?`)) return;

    let succeeded = 0;
    const failed = [];

    for (const id of selectedIds) {
      const target = apps.find((a) => a.id === id);
      if (!target) continue;
      try {
        const res = await fetch(`/api/apps/${target.slug}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        succeeded++;
      } catch {
        failed.push(target.name);
      }
    }

    if (failed.length === 0) {
      toast.success(`Deleted ${succeeded} app${succeeded === 1 ? '' : 's'}`);
    } else if (succeeded === 0) {
      toast.error(`Failed to delete ${failed.length} app${failed.length === 1 ? '' : 's'}`);
    } else {
      toast.warning(`Deleted ${succeeded}, but failed to delete: ${failed.join(', ')}`);
    }
    fetchData();
  };

  const handleBulkStatusChange = async (selectedIds, newStatus) => {
    let succeeded = 0;
    const failed = [];

    for (const id of selectedIds) {
      const target = apps.find((a) => a.id === id);
      if (!target) continue;
      try {
        const res = await fetch(`/api/apps/${target.slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error();
        succeeded++;
      } catch {
        failed.push(target.name);
      }
    }

    if (failed.length === 0) {
      toast.success(`Updated ${succeeded} app${succeeded === 1 ? '' : 's'} to ${newStatus}`);
    } else if (succeeded === 0) {
      toast.error(`Failed to update ${failed.length} app${failed.length === 1 ? '' : 's'}`);
    } else {
      toast.warning(`Updated ${succeeded}, but failed for: ${failed.join(', ')}`);
    }
    fetchData();
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${label} to clipboard!`);
    } catch {
      toast.warning(`Could not copy: ${text}`);
    }
  };

  // Define Table Columns
  const columns = [
    {
      header: 'App Name & Identifier',
      accessor: 'name',
      render: (_, row) => {
        const iconUrl = getAppIconUrl(row);
        return (
          <div className={styles.appRowCell}>
            <img
              src={iconUrl}
              alt={row.name}
              className={styles.appIconImg}
              onError={(e) => {
                e.currentTarget.src = `/api/placeholder/icon/${row.slug}`;
              }}
            />
            <div className={styles.appInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Link href={`/admin/apps/${row.slug}/edit`} className={styles.appTitleLink}>
                  {row.name}
                </Link>
                {row.appType === 'MOD' && (
                  <span
                    className="badge"
                    style={{ fontSize: '0.625rem', padding: '1px 5px', background: '#f59e0b', color: '#000000', fontWeight: 800 }}
                    title={row.modDetails ? `MOD: ${row.modDetails}` : 'Modded App'}
                  >
                    ⚡ MOD
                  </span>
                )}
                {row.developerType === 'OTHER' ? (
                  <span
                    className="badge"
                    style={{ fontSize: '0.625rem', padding: '1px 5px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                    title={`Developer: ${row.developerName}`}
                  >
                    By {row.developerName || 'Other Dev'}
                  </span>
                ) : (
                  <span
                    className="badge"
                    style={{ fontSize: '0.625rem', padding: '1px 5px', background: 'rgba(211, 47, 47, 0.08)', color: 'var(--color-primary)', border: '1px solid rgba(211, 47, 47, 0.2)' }}
                    title="Official Silver Byte Studios App"
                  >
                    Silver Byte
                  </span>
                )}
                {(row.isTesting || row.playStoreUrl || row.playStoreWebUrl) && (
                  <span
                    className="badge badge-danger"
                    style={{ fontSize: '0.625rem', padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    title={`Testing Track: ${row.testingTrack || 'Early Access'}`}
                  >
                    <FlaskConical size={9} />
                    <span>{row.testingTrack ? row.testingTrack.replace(/_/g, ' ') : 'Testing'}</span>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={styles.packageIdText}>{row.packageId}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(row.packageId, 'Package ID')}
                  title="Copy Package ID"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--color-text-tertiary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Category',
      accessor: 'categoryId',
      render: (_, row) => (
        <span
          className="badge"
          style={{
            backgroundColor: row.category?.color ? `${row.category.color}15` : 'var(--color-gray-100)',
            color: row.category?.color || 'var(--color-text)',
            border: `1px solid ${row.category?.color || '#ccc'}30`,
          }}
        >
          {row.category?.name || 'Uncategorized'}
        </span>
      ),
    },
    {
      header: 'Latest Version',
      accessor: 'latestVersion',
      render: (_, row) => {
        const latest = row.latestVersion || row.versions?.[0];
        if (!latest) return <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8125rem' }}>No build</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>v{latest.versionName}</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>Code: {latest.versionCode}</span>
          </div>
        );
      },
    },
    {
      header: 'Downloads',
      accessor: 'downloads',
      render: (val) => <span style={{ fontWeight: 600 }}>{formatNumber(val || 0)}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status, row) => {
        let badgeClass = 'badge-neutral';
        if (status === 'PUBLISHED') badgeClass = 'badge-success';
        else if (status === 'DRAFT') badgeClass = 'badge-warning';
        else if (status === 'ARCHIVED') badgeClass = 'badge-danger';
        return (
          <button
            type="button"
            className={`badge ${badgeClass}`}
            onClick={() => handleTogglePublish(row)}
            title={`Click to ${status === 'PUBLISHED' ? 'unpublish (set to Draft)' : 'publish'}`}
            style={{ cursor: 'pointer', border: 'none' }}
          >
            {status}
          </button>
        );
      },
    },
  ];

  // Define Row Actions Menu
  const rowActions = [
    {
      label: 'Edit Details',
      icon: Edit,
      onClick: (row) => router.push(`/admin/apps/${row.slug}/edit`),
    },
    {
      label: 'Manage Releases',
      icon: Layers,
      onClick: (row) => router.push(`/admin/apps/${row.slug}/releases`),
    },
    {
      label: 'Quick Add Release',
      icon: Plus,
      onClick: (row) => setQuickReleaseApp(row),
    },
    {
      label: 'Copy Quick Share Link',
      icon: Share2,
      onClick: (row) => {
        const quickShareUrl = `${window.location.origin}/d/${row.slug}`;
        copyToClipboard(quickShareUrl, 'Quick Share Link');
      },
    },
    {
      label: 'Copy Direct APK Link',
      icon: Download,
      onClick: (row) => {
        const directUrl = `${window.location.origin}/api/apps/${row.slug}/download`;
        copyToClipboard(directUrl, 'Direct APK Link');
      },
    },
    {
      label: 'Copy Store Link',
      icon: Copy,
      onClick: (row) => {
        const fullUrl = `${window.location.origin}/apps/${row.slug}`;
        copyToClipboard(fullUrl, 'Store Link');
      },
    },
    {
      label: 'Copy Play Store App Link',
      icon: Smartphone,
      onClick: (row) => {
        if (row.playStoreUrl) {
          copyToClipboard(row.playStoreUrl, 'Play Store App Link');
        } else {
          toast.warning('No Play Store direct app link configured for this app');
        }
      },
    },
    {
      label: 'Copy Play Store Web Link',
      icon: Globe,
      onClick: (row) => {
        if (row.playStoreWebUrl) {
          copyToClipboard(row.playStoreWebUrl, 'Play Store Web Opt-In Link');
        } else {
          toast.warning('No Play Store web opt-in link configured for this app');
        }
      },
    },
    {
      label: 'View on Store',
      icon: ExternalLink,
      onClick: (row) => window.open(`/apps/${row.slug}`, '_blank'),
    },
    {
      label: 'Duplicate App',
      icon: Copy,
      onClick: (row) => handleDuplicate(row),
    },
    {
      label: 'Toggle Status',
      icon: CheckCircle,
      onClick: (row) => handleTogglePublish(row),
    },
    {
      label: 'Delete App',
      icon: Trash2,
      variant: 'danger',
      onClick: (row) => handleDelete(row),
    },
  ];

  const categoryFilterOptions = [
    { label: 'All Categories', value: '' },
    ...categories.map((c) => ({ label: c.name, value: c.id })),
  ];

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.heading}>Application Management</h1>
          <p className={styles.subheading}>
            Manage all Silver Red Store listings, releases, and store metadata
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setIsQuickUploadOpen(true)}>
            <Zap size={16} />
            <span>Quick Upload</span>
          </button>
          <Link href="/admin/apps/new" className="btn btn-primary">
            <Plus size={16} />
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className={styles.filterTabs}>
        <button
          type="button"
          className={`${styles.filterTab} ${selectedTab === 'ALL' ? styles.active : ''}`}
          onClick={() => setSelectedTab('ALL')}
        >
          <span>All Apps</span>
          <span className={styles.tabCount}>{apps.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.filterTab} ${selectedTab === 'PUBLISHED' ? styles.active : ''}`}
          onClick={() => setSelectedTab('PUBLISHED')}
        >
          <span>Published</span>
          <span className={styles.tabCount}>{publishedCount}</span>
        </button>

        <button
          type="button"
          className={`${styles.filterTab} ${selectedTab === 'DRAFT' ? styles.active : ''}`}
          onClick={() => setSelectedTab('DRAFT')}
        >
          <span>Drafts</span>
          <span className={styles.tabCount}>{draftCount}</span>
        </button>

        <button
          type="button"
          className={`${styles.filterTab} ${selectedTab === 'ARCHIVED' ? styles.active : ''}`}
          onClick={() => setSelectedTab('ARCHIVED')}
        >
          <span>Archived</span>
          <span className={styles.tabCount}>{archivedCount}</span>
        </button>
      </div>

      {/* Secondary Filter Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Origin:</span>
          <select
            className="select"
            value={selectedDevType}
            onChange={(e) => setSelectedDevType(e.target.value)}
            style={{ width: 'auto', minWidth: 160, padding: '4px 10px', fontSize: '0.8125rem' }}
          >
            <option value="ALL">All Origins ({apps.length})</option>
            <option value="SILVER_BYTE">From Silver Byte Studios ({apps.filter((a) => (a.developerType || 'SILVER_BYTE') === 'SILVER_BYTE').length})</option>
            <option value="OTHER">From Other Developers ({apps.filter((a) => a.developerType === 'OTHER').length})</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Type:</span>
          <select
            className="select"
            value={selectedAppType}
            onChange={(e) => setSelectedAppType(e.target.value)}
            style={{ width: 'auto', minWidth: 140, padding: '4px 10px', fontSize: '0.8125rem' }}
          >
            <option value="ALL">All Types ({apps.length})</option>
            <option value="NORMAL">Normal Apps ({apps.filter((a) => (a.appType || 'NORMAL') === 'NORMAL').length})</option>
            <option value="MOD">Mod Apps ({apps.filter((a) => a.appType === 'MOD').length})</option>
          </select>
        </div>

        {(selectedDevType !== 'ALL' || selectedAppType !== 'ALL' || selectedCategory) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSelectedDevType('ALL');
              setSelectedAppType('ALL');
              setSelectedCategory('');
            }}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Rich DataTable */}
      <DataTable
        columns={columns}
        data={filteredApps}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search apps by name or package ID..."
        filterOptions={categoryFilterOptions}
        selectedFilter={selectedCategory}
        onFilterChange={setSelectedCategory}
        enableSelection={true}
        bulkActions={[
          {
            label: 'Publish',
            icon: CheckCircle,
            onClick: (ids) => handleBulkStatusChange(ids, 'PUBLISHED'),
          },
          {
            label: 'Archive',
            icon: Archive,
            onClick: (ids) => handleBulkStatusChange(ids, 'ARCHIVED'),
          },
          {
            label: 'Delete',
            variant: 'danger',
            icon: Trash2,
            onClick: handleBulkDelete,
          },
        ]}
        rowActions={rowActions}
        emptyMessage="No applications found"
        emptySubMessage="Try adjusting your filter or search query, or create a new app."
      />

      {/* Quick Release Modal */}
      {quickReleaseApp && (
        <ReleaseFormModal
          isOpen={Boolean(quickReleaseApp)}
          onClose={() => setQuickReleaseApp(null)}
          app={quickReleaseApp}
          onSuccess={() => {
            fetchData();
            setQuickReleaseApp(null);
          }}
        />
      )}

      {/* Quick Upload Modal */}
      <QuickUploadModal
        isOpen={isQuickUploadOpen}
        onClose={() => setIsQuickUploadOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
