'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Layers,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Edit2,
  Trash2,
  Power,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/components/admin/ToastContext';
import ReleaseFormModal from '@/components/admin/ReleaseFormModal';
import { formatFileSize, formatDate, formatNumber } from '@/lib/utils';
import styles from './releases.module.css';

export default function AppReleasesPage({ params }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;

  const { toast } = useToast();
  const [app, setApp] = useState(null);
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);
  const [expandedChangelogs, setExpandedChangelogs] = useState({});

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/apps/${slug}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load app');
      }

      setApp(json.data);
      setVersions(json.data.versions || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load releases');
    } finally {
      setIsLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug, loadData]);

  const toggleChangelog = (id) => {
    setExpandedChangelogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleStatus = async (version) => {
    const nextStatus = version.status === 'PUBLISHED' ? 'DISABLED' : 'PUBLISHED';
    if (
      !window.confirm(
        `${nextStatus === 'DISABLED' ? 'Disable' : 'Enable'} release v${version.versionName}? ${
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
      if (!res.ok) throw new Error(json.error || 'Failed to update version status');

      toast.success(`Version v${version.versionName} status set to ${nextStatus}`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Status change failed');
    }
  };

  const handleDeleteVersion = async (version) => {
    if (!window.confirm(`Delete release v${version.versionName} (code ${version.versionCode})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/versions/${version.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete version');

      toast.success(`Version v${version.versionName} deleted`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ width: 280, height: 28 }} />
        <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 350, borderRadius: 14 }} />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">App Not Found</h3>
        <Link href="/admin/apps" className="btn btn-primary">
          Back to Apps List
        </Link>
      </div>
    );
  }

  const latestActiveRelease = versions.find((v) => v.status === 'PUBLISHED') || versions[0];
  const totalDownloads = versions.reduce((sum, v) => sum + (v.downloads || 0), 0);

  return (
    <div className={styles.releasesContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Link href={`/admin/apps/${app.slug}/edit`} className={styles.backLink}>
            <ArrowLeft size={14} />
            <span>Back to App Settings</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <h1 className={styles.pageTitle}>{app.name} Releases</h1>
            <span className="badge badge-neutral">{versions.length} Total Builds</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditingVersion(null);
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Create New Release</span>
        </button>
      </div>

      {/* Google Play Console style Production Track Summary Card */}
      {latestActiveRelease && (
        <div className={styles.trackCard}>
          <div className={styles.trackHeader}>
            <div className={styles.trackTitleGroup}>
              <div className={styles.trackBadge}>
                <CheckCircle2 size={16} />
                <span>Production Track</span>
              </div>
              <h2 className={styles.trackVersionTitle}>
                v{latestActiveRelease.versionName}{' '}
                <span className={styles.trackVersionCode}>(Code {latestActiveRelease.versionCode})</span>
              </h2>
            </div>

            <span
              className={`badge ${
                latestActiveRelease.status === 'PUBLISHED'
                  ? 'badge-success'
                  : latestActiveRelease.status === 'DRAFT'
                  ? 'badge-warning'
                  : 'badge-danger'
              }`}
            >
              {latestActiveRelease.status}
            </span>
          </div>

          {!latestActiveRelease.filePath && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
                fontSize: '0.8125rem',
                marginBottom: 'var(--space-3)',
              }}
            >
              <AlertTriangle size={14} />
              <span>No build file attached — downloads currently serve a labeled sample package, not the real app.</span>
            </div>
          )}

          <div className={styles.trackMetaGrid}>
            <div className={styles.trackMetaItem}>
              <span className={styles.metaLabel}>Platform</span>
              <span className={styles.metaVal}>{latestActiveRelease.platform || 'Android'}</span>
            </div>
            <div className={styles.trackMetaItem}>
              <span className={styles.metaLabel}>Minimum OS</span>
              <span className={styles.metaVal}>{latestActiveRelease.minOsVersion || 'Android 8.0'}</span>
            </div>
            <div className={styles.trackMetaItem}>
              <span className={styles.metaLabel}>Build Size</span>
              <span className={styles.metaVal}>
                {latestActiveRelease.filePath ? formatFileSize(latestActiveRelease.fileSize) : '—'}
              </span>
            </div>
            <div className={styles.trackMetaItem}>
              <span className={styles.metaLabel}>Total Downloads</span>
              <span className={styles.metaVal}>{formatNumber(latestActiveRelease.downloads || 0)}</span>
            </div>
            <div className={styles.trackMetaItem}>
              <span className={styles.metaLabel}>Release Date</span>
              <span className={styles.metaVal}>{formatDate(latestActiveRelease.createdAt)}</span>
            </div>
          </div>

          {latestActiveRelease.changelog && (
            <div className={styles.trackChangelog}>
              <div className={styles.changelogTitle}>What&apos;s new in this version:</div>
              <div className={styles.changelogText}>{latestActiveRelease.changelog}</div>
            </div>
          )}
        </div>
      )}

      {/* Release History Table */}
      <div className={styles.historyCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Release History</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Total Release Downloads: <strong>{formatNumber(totalDownloads)}</strong>
          </span>
        </div>

        {versions.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <Layers size={40} className="empty-state-icon" />
            <h4 className="empty-state-title">No releases uploaded yet</h4>
            <p className="empty-state-desc">
              Create your initial release bundle to allow users to download and install this application.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsModalOpen(true)}
            >
              Upload First APK
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Platform</th>
                  <th>Min OS</th>
                  <th>File Size</th>
                  <th>Downloads</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Changelog</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((ver) => {
                  const isExpanded = expandedChangelogs[ver.id];
                  return (
                    <React.Fragment key={ver.id}>
                      <tr>
                        <td style={{ fontWeight: 600 }}>
                          v{ver.versionName}{' '}
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                            ({ver.versionCode})
                          </span>
                          {!ver.filePath && (
                            <span
                              className="badge badge-warning"
                              style={{ marginLeft: 6, fontSize: '0.6875rem' }}
                              title="No build file uploaded — downloads will serve a labeled sample package"
                            >
                              No file
                            </span>
                          )}
                        </td>
                        <td>{ver.platform || 'Android'}</td>
                        <td>{ver.minOsVersion || 'Android 8.0'}</td>
                        <td>{ver.filePath ? formatFileSize(ver.fileSize) : '—'}</td>
                        <td style={{ fontWeight: 600 }}>{formatNumber(ver.downloads || 0)}</td>
                        <td>
                          <span
                            className={`badge ${
                              ver.status === 'PUBLISHED'
                                ? 'badge-success'
                                : ver.status === 'DRAFT'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                          >
                            {ver.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                          {formatDate(ver.createdAt)}
                        </td>
                        <td>
                          {ver.changelog ? (
                            <button
                              type="button"
                              className={styles.changelogToggleBtn}
                              onClick={() => toggleChangelog(ver.id)}
                            >
                              <span>{isExpanded ? 'Hide' : 'View Notes'}</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>
                              None
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <a
                              href={`/api/apps/${app.slug}/versions/${ver.id}/download`}
                              download={ver.fileName || `${app.slug}-v${ver.versionName}.apk`}
                              className="btn-icon btn-ghost"
                              title="Download build binary"
                            >
                              <Download size={15} />
                            </a>

                            <button
                              type="button"
                              className="btn-icon btn-ghost"
                              onClick={() => handleToggleStatus(ver)}
                              title={ver.status === 'PUBLISHED' ? 'Disable Version' : 'Enable Version'}
                            >
                              <Power
                                size={15}
                                color={ver.status === 'PUBLISHED' ? 'var(--color-warning)' : 'var(--color-success)'}
                              />
                            </button>

                            <button
                              type="button"
                              className="btn-icon btn-ghost"
                              onClick={() => {
                                setEditingVersion(ver);
                                setIsModalOpen(true);
                              }}
                              title="Edit Release"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              type="button"
                              className="btn-icon btn-ghost"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={() => handleDeleteVersion(ver)}
                              title="Delete Release"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && ver.changelog && (
                        <tr>
                          <td colSpan={9} style={{ backgroundColor: 'var(--color-gray-50)', padding: '12px 20px' }}>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                              <strong style={{ color: 'var(--color-text)' }}>Release Notes: </strong>
                              {ver.changelog}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Release Form Modal */}
      <ReleaseFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVersion(null);
        }}
        app={app}
        initialData={editingVersion}
        onSuccess={() => {
          loadData();
          setIsModalOpen(false);
          setEditingVersion(null);
        }}
      />
    </div>
  );
}
