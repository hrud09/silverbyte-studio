'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Lock,
  Globe,
  Ban,
  Mail,
  QrCode as QrCodeIcon,
  Download,
  Link2,
} from 'lucide-react';
import DataTable from '@/components/admin/DataTable';
import QuickShareModal from '@/components/admin/QuickShareModal';
import ShareLinkAddress from '@/components/admin/ShareLinkAddress';
import QrCode from '@/components/ui/QrCode';
import { useToast } from '@/components/admin/ToastContext';
import { formatFileSize, formatNumber, formatRelativeTime, formatDate } from '@/lib/utils';
import styles from './share.module.css';

export default function AdminQuickSharePage() {
  const { toast } = useToast();

  const [shares, setShares] = useState([]);
  // Where links are being built from, and how far that address reaches.
  const [link, setLink] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState('');
  const [qrShare, setQrShare] = useState(null);

  const fetchShares = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/quick-share');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load shares');
      setShares(json.data?.shares || []);
      setLink(json.data?.link || null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not load shares');
    } finally {
      setIsLoading(false);
    }
    // `toast` is rebuilt on every provider render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const copyLink = async (share) => {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      toast.warning('Could not copy — open the share and copy the link from there.');
    }
  };

  /**
   * Copy the build's address in storage instead of the share link.
   *
   * The share page is only reachable if this server is; the file on the CDN is
   * reachable regardless. That makes this the one thing that still works when the
   * store runs on a laptop — at the cost of a URL that cannot be revoked or counted,
   * which is why the confirmation spells that out and why the server refuses it for
   * private shares.
   */
  const copyDirectLink = async (share) => {
    try {
      const res = await fetch(`/api/admin/quick-share/${share.id}/direct`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'No direct link available');

      await navigator.clipboard.writeText(json.data.url);
      toast.success(
        json.data.permanent
          ? 'Direct file link copied. It downloads straight from storage and cannot be revoked.'
          : 'Direct file link copied. It is signed and expires within the hour.'
      );
    } catch (err) {
      toast.error(err.message || 'Could not build a direct link');
    }
  };

  const patchShare = async (share, data, successMessage) => {
    try {
      const res = await fetch(`/api/admin/quick-share/${share.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Update failed');

      setShares((prev) => prev.map((s) => (s.id === share.id ? json.data : s)));
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.message || 'Could not update the share');
    }
  };

  const handleDelete = async (share) => {
    if (
      !window.confirm(
        `Delete "${share.title}"?\n\nThe link stops working immediately and the uploaded file is removed from storage. This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/quick-share/${share.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed');

      setShares((prev) => prev.filter((s) => s.id !== share.id));
      if (json.data?.fileDeleted === false) {
        toast.warning('Share deleted, but the stored file could not be removed. Check the storage audit.');
      } else {
        toast.success('Share deleted');
      }
    } catch (err) {
      toast.error(err.message || 'Could not delete the share');
    }
  };

  const columns = [
    {
      header: 'Title',
      accessor: 'title',
      render: (_, row) => (
        <div className={styles.titleCell}>
          <span className={`${styles.visibilityDot} ${row.isPrivate ? styles.private : styles.public}`}>
            {row.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
          </span>
          <div className={styles.titleInfo}>
            <span className={`${styles.titleText} ${!row.isActive ? styles.revoked : ''}`}>{row.title}</span>
            <span className={styles.fileNameText}>
              {row.fileName}
              {row.fileSize > 0 && ` · ${formatFileSize(row.fileSize)}`}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Link',
      accessor: 'url',
      render: (_, row) => (
        <div className={styles.linkCell}>
          <code className={styles.tokenCode}>/s/{row.token}</code>
          <button
            type="button"
            className={styles.inlineIconBtn}
            onClick={() => copyLink(row)}
            title="Copy full link"
            aria-label={`Copy link for ${row.title}`}
          >
            {copiedId === row.id ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
          </button>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (_, row) => {
        if (!row.isActive) return <span className="badge badge-danger">Revoked</span>;
        return row.isPrivate ? (
          <span className="badge badge-neutral">Private</span>
        ) : (
          <span className="badge badge-info">Public</span>
        );
      },
    },
    {
      header: 'Downloads',
      accessor: 'downloads',
      render: (_, row) => (
        <div className={styles.downloadsCell}>
          <span className={styles.downloadCount}>{formatNumber(row.downloads)}</span>
          {row.lastDownloadAt && (
            <span className={styles.subtleText}>{formatRelativeTime(row.lastDownloadAt)}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Expires',
      accessor: 'expiresAt',
      render: (_, row) => {
        if (!row.expiresAt) {
          return <span className={styles.subtleText}>Never</span>;
        }
        const isExp = row.isExpired || new Date(row.expiresAt).getTime() <= Date.now();
        if (isExp) {
          return <span className="badge badge-danger">Expired</span>;
        }
        return (
          <div className={styles.downloadsCell}>
            <span className={styles.expiryCount}>In {formatRelativeTime(row.expiresAt)}</span>
            <span className={styles.subtleText}>{formatDate(row.expiresAt)}</span>
          </div>
        );
      },
    },
    {
      header: 'Shared',
      accessor: 'createdAt',
      render: (_, row) => (
        <div className={styles.downloadsCell}>
          <span className={styles.subtleText}>{formatRelativeTime(row.createdAt)}</span>
          {row.lastEmailedTo && (
            <span className={styles.emailedText} title={`Last emailed to ${row.lastEmailedTo}`}>
              <Mail size={11} />
              <span>{row.lastEmailedTo}</span>
            </span>
          )}
        </div>
      ),
    },
  ];

  const rowActions = [
    {
      label: 'Copy Link',
      icon: Copy,
      onClick: (row) => copyLink(row),
    },
    {
      label: 'Show QR Code',
      icon: QrCodeIcon,
      onClick: (row) => setQrShare(row),
    },
    {
      label: 'Copy Direct File Link',
      icon: Link2,
      onClick: (row) => copyDirectLink(row),
    },
    {
      label: 'Open Share Page',
      icon: ExternalLink,
      onClick: (row) => window.open(row.url, '_blank', 'noopener'),
    },
    {
      label: 'Toggle Private / Public',
      icon: Lock,
      onClick: (row) =>
        patchShare(
          row,
          { isPrivate: !row.isPrivate },
          row.isPrivate ? `"${row.title}" is now public` : `"${row.title}" is now private`
        ),
    },
    {
      label: 'Revoke / Restore Link',
      icon: Ban,
      onClick: (row) =>
        patchShare(
          row,
          { isActive: !row.isActive },
          row.isActive ? `"${row.title}" revoked — the link no longer works` : `"${row.title}" restored`
        ),
    },
    {
      label: 'Delete Share',
      icon: Trash2,
      variant: 'danger',
      onClick: (row) => handleDelete(row),
    },
  ];

  const filtered = shares.filter((s) => {
    if (statusFilter === 'PRIVATE') return s.isActive && s.isPrivate;
    if (statusFilter === 'PUBLIC') return s.isActive && !s.isPrivate;
    if (statusFilter === 'EXPIRING_SOON') {
      if (!s.expiresAt || !s.isActive) return false;
      const timeLeft = new Date(s.expiresAt).getTime() - Date.now();
      return timeLeft > 0 && timeLeft <= 24 * 60 * 60 * 1000;
    }
    if (statusFilter === 'REVOKED') return !s.isActive;
    return true;
  });

  const activeCount = shares.filter((s) => s.isActive).length;
  const totalDownloads = shares.reduce((sum, s) => sum + (s.downloads || 0), 0);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.heading}>Quick Share</h1>
          <p className={styles.subheading}>
            Send a build straight to someone — a title, a file, and a link. Nothing here appears
            in the store.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>New Share</span>
        </button>
      </div>

      {!isLoading && <ShareLinkAddress link={link} onSaved={fetchShares} />}

      {!isLoading && shares.length > 0 && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{formatNumber(activeCount)}</span>
            <span className={styles.summaryLabel}>Active link{activeCount === 1 ? '' : 's'}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{formatNumber(totalDownloads)}</span>
            <span className={styles.summaryLabel}>Total downloads</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>
              {formatFileSize(shares.reduce((sum, s) => sum + (s.fileSize || 0), 0))}
            </span>
            <span className={styles.summaryLabel}>Stored</span>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Search shares by title or file name..."
        filterOptions={[
          { label: 'All Shares', value: 'ALL' },
          { label: 'Private', value: 'PRIVATE' },
          { label: 'Public', value: 'PUBLIC' },
          { label: 'Expiring Soon', value: 'EXPIRING_SOON' },
          { label: 'Revoked', value: 'REVOKED' },
        ]}
        selectedFilter={statusFilter}
        onFilterChange={setStatusFilter}
        rowActions={rowActions}
        emptyMessage="No shares yet"
        emptySubMessage='Hit "New Share" to upload a build and get a link you can send to anyone.'
      />

      <QuickShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchShares}
      />

      {qrShare && (
        <div className="modal-backdrop" onClick={() => setQrShare(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{qrShare.title}</h3>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setQrShare(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div className={styles.qrFrame}>
                <QrCode value={qrShare.url} size={220} title={`QR code for ${qrShare.title}`} />
              </div>
              <p className={styles.qrUrl}>{qrShare.url}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => copyLink(qrShare)}>
                {copiedId === qrShare.id ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedId === qrShare.id ? 'Copied' : 'Copy link'}</span>
              </button>
              <a
                href={qrShare.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <Download size={15} />
                <span>Open</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
