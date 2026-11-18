'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Power,
  Trash2,
  Edit2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import Dropdown from '@/components/ui/Dropdown';
import { useToast } from '@/components/admin/ToastContext';
import ReleaseFormModal from '@/components/admin/ReleaseFormModal';
import { formatFileSize, formatDate, formatNumber, getAppIconUrl } from '@/lib/utils';
import { PLATFORMS } from '@/lib/constants';

export default function AdminGlobalReleasesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [versions, setVersions] = useState([]);
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppForUpload, setSelectedAppForUpload] = useState(null);
  const [editingVersion, setEditingVersion] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [vRes, aRes] = await Promise.all([
        fetch('/api/versions'),
        fetch('/api/apps?status=ALL&limit=100'),
      ]);

      const vJson = await vRes.json();
      const aJson = await aRes.json();

      if (vJson.success) setVersions(vJson.data || []);
      if (aJson.success) setApps(aJson.data.apps || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load releases');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${label} to clipboard!`);
    } catch {
      toast.warning(`Could not copy: ${text}`);
    }
  };

  const handleToggleStatus = async (version) => {
    const nextStatus = version.status === 'PUBLISHED' ? 'DISABLED' : 'PUBLISHED';
    if (
      !window.confirm(
        `${nextStatus === 'DISABLED' ? 'Disable' : 'Enable'} release v${version.versionName} for ${version.app?.name || 'this app'}? ${
          nextStatus === 'DISABLED' ? 'Users will no longer be able to download it.' : 'It will become downloadable again.'
        }`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/versions/${version.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update release');

      toast.success(`Release v${version.versionName} status set to ${nextStatus}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const handleDelete = async (version) => {
    if (!window.confirm(`Delete release v${version.versionName} for ${version.app?.name || 'app'}?`)) return;

    try {
      const res = await fetch(`/api/versions/${version.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete release');

      toast.success(`Release v${version.versionName} deleted`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const filteredVersions = versions.filter((v) => {
    if (selectedPlatform && v.platform !== selectedPlatform) return false;
    if (selectedApp && v.app?.slug !== selectedApp && v.app?.id !== selectedApp) return false;
    return true;
  });

  const columns = [
    {
      header: 'Application',
      accessor: 'app',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={getAppIconUrl(row.app)}
            alt=""
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
          />
          <div>
            <Link
              href={`/admin/apps/${row.app?.slug}/releases`}
              style={{ fontWeight: 600, color: 'var(--color-text)' }}
            >
              {row.app?.name || 'App'}
            </Link>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
              {row.app?.packageId}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Version & Code',
      accessor: 'versionName',
      render: (val, row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            v{val}
            {!row.filePath && (
              <AlertTriangle
                size={13}
                color="var(--color-warning)"
                title="No build file uploaded — downloads serve a labeled sample package"
              />
            )}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)' }}>
            Code {row.versionCode}
          </span>
        </div>
      ),
    },
    {
      header: 'Platform',
      accessor: 'platform',
      render: (val) => val || 'Android',
    },
    {
      header: 'Min OS',
      accessor: 'minOsVersion',
      render: (val) => val || 'Android 8.0',
    },
    {
      header: 'Size',
      accessor: 'fileSize',
      render: (val, row) => (row.filePath ? formatFileSize(val) : '—'),
    },
    {
      header: 'Downloads',
      accessor: 'downloads',
      render: (val) => <span style={{ fontWeight: 600 }}>{formatNumber(val || 0)}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (st) => (
        <span
          className={`badge ${
            st === 'PUBLISHED'
              ? 'badge-success'
              : st === 'DRAFT'
              ? 'badge-warning'
              : 'badge-danger'
          }`}
        >
          {st}
        </span>
      ),
    },
    {
      header: 'Release Date',
      accessor: 'createdAt',
      render: (val) => formatDate(val),
    },
  ];

  const rowActions = [
    {
      label: 'Edit Release',
      icon: Edit2,
      onClick: (row) => {
        setEditingVersion(row);
        setSelectedAppForUpload(row.app);
        setIsModalOpen(true);
      },
    },
    {
      label: 'Copy Download Link',
      icon: Layers,
      onClick: (row) => {
        const downloadUrl = `${window.location.origin}/api/apps/${row.app?.slug}/versions/${row.id}/download`;
        copyToClipboard(downloadUrl, 'Download URL');
      },
    },
    {
      label: 'Manage App Releases',
      icon: Layers,
      onClick: (row) => {
        router.push(`/admin/apps/${row.app?.slug}/releases`);
      },
    },
    {
      label: 'Toggle Active/Disabled',
      icon: Power,
      onClick: (row) => handleToggleStatus(row),
    },
    {
      label: 'Delete Release',
      icon: Trash2,
      variant: 'danger',
      onClick: (row) => handleDelete(row),
    },
  ];

  const platformFilterOptions = [
    { label: 'All Platforms', value: '' },
    ...PLATFORMS.map((p) => ({ label: p, value: p })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Release Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Monitor and distribute APK/bundle builds across all Silver Red Store applications
          </p>
        </div>

        {apps.length > 0 && (
          <Dropdown
            trigger={
              <button type="button" className="btn btn-primary">
                <Plus size={16} />
                <span>Upload New Release</span>
                <ChevronDown size={14} />
              </button>
            }
            items={apps.map((a) => ({
              label: a.name,
              onClick: () => {
                setSelectedAppForUpload(a);
                setEditingVersion(null);
                setIsModalOpen(true);
              },
            }))}
          />
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredVersions}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search releases by app or version name..."
        filterOptions={platformFilterOptions}
        selectedFilter={selectedPlatform}
        onFilterChange={setSelectedPlatform}
        rowActions={rowActions}
        emptyMessage="No release builds found"
        emptySubMessage="Upload build binaries to make your apps downloadable."
      />

      {isModalOpen && (
        <ReleaseFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingVersion(null);
          }}
          app={selectedAppForUpload || apps[0]}
          initialData={editingVersion}
          onSuccess={() => {
            fetchData();
            setIsModalOpen(false);
            setEditingVersion(null);
          }}
        />
      )}
    </div>
  );
}
