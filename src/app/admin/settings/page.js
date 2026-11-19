'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Megaphone,
  Sparkles,
  Shield,
  FileText,
  Save,
  CheckCircle,
  AlertCircle,
  Globe,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Download,
  Activity,
  FileJson,
} from 'lucide-react';
import { useToast } from '@/components/admin/ToastContext';
import { formatFileSize } from '@/lib/utils';
import styles from './settings.module.css';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'storage' | 'announcement' | 'legal'
  const [isLoading, setIsLoading] = useState(true);
  const [storageStatus, setStorageStatus] = useState(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const checkStorageConnection = async () => {
    try {
      setIsCheckingStorage(true);
      const res = await fetch('/api/admin/github-status');
      const json = await res.json();
      if (json.success) {
        setStorageStatus(json.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to query storage status');
    } finally {
      setIsCheckingStorage(false);
    }
  };

  const runStorageAudit = async () => {
    try {
      setIsAuditing(true);
      const res = await fetch('/api/admin/storage-audit');
      const json = await res.json();
      if (json.success) {
        setAuditData(json.data);
        toast.success('Storage audit completed');
      } else {
        throw new Error(json.error || 'Audit failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Storage audit failed');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExportCatalog = async () => {
    try {
      toast.info('Exporting catalog metadata...', 'Backup');
      const res = await fetch('/api/apps?status=ALL&limit=500');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to fetch apps data');

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(json.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `silver-red-store-catalog-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Catalog metadata backup downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    }
  };

  // Settings State
  const [settings, setSettings] = useState({
    store_announcement: '',
    store_announcement_enabled: 'false',
    featured_banner_title: 'Discover Amazing Apps',
    featured_banner_subtitle: 'A personal Apps and Games store by Silver Byte Studios.',
    developer_name: 'Silver Byte Studios',
    support_email: 'support@silverbytestudios.com',
    privacy_policy: '',
    terms_of_service: '',
    enable_downloads: 'true',
    require_auth_for_downloads: 'false',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success) {
          setSettings((prev) => ({ ...prev, ...json.data }));
        }
        await checkStorageConnection();
      } catch (err) {
        console.error(err);
        toast.error('Failed to load platform settings');
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [toast]);

  const handleChange = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update settings');

      toast.success('Platform settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ width: 240, height: 28 }} />
        <div className="skeleton" style={{ height: 450, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Platform Settings</h1>
          <p className={styles.subtitle}>
            Configure store banner text, announcements, developer credentials, and legal pages
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCatalog}
            title="Download JSON backup of all app metadata"
          >
            <FileJson size={16} />
            <span>Export Catalog Backup</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="spinner" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Card Shell */}
      <div className={styles.cardShell}>
        {/* Tabs Bar */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'store' ? styles.active : ''}`}
            onClick={() => setActiveTab('store')}
          >
            <Globe size={16} />
            <span>Storefront & Hero</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'storage' ? styles.active : ''}`}
            onClick={() => setActiveTab('storage')}
          >
            <HardDrive size={16} />
            <span>File Storage</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'announcement' ? styles.active : ''}`}
            onClick={() => setActiveTab('announcement')}
          >
            <Megaphone size={16} />
            <span>Announcement Banner</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'legal' ? styles.active : ''}`}
            onClick={() => setActiveTab('legal')}
          >
            <FileText size={16} />
            <span>Legal & Privacy</span>
          </button>
        </div>

        {/* Tab 1: Storefront & Hero */}
        {activeTab === 'store' && (
          <div className={styles.tabBody}>
            <h3 className={styles.sectionHeader}>Hero Banner Customization</h3>

            <div className={styles.formGrid}>
              <div className="input-group">
                <label className="input-label">Hero Title</label>
                <input
                  type="text"
                  className="input"
                  value={settings.featured_banner_title || ''}
                  onChange={(e) => handleChange('featured_banner_title', e.target.value)}
                  placeholder="Discover Amazing Apps"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Hero Subtitle</label>
                <input
                  type="text"
                  className="input"
                  value={settings.featured_banner_subtitle || ''}
                  onChange={(e) => handleChange('featured_banner_subtitle', e.target.value)}
                  placeholder="A personal Apps and Games store by Silver Byte Studios."
                />
              </div>

              <div className="input-group">
                <label className="input-label">Primary Studio / Developer Name</label>
                <input
                  type="text"
                  className="input"
                  value={settings.developer_name || ''}
                  onChange={(e) => handleChange('developer_name', e.target.value)}
                  placeholder="Silver Byte Studios"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Support Email Address</label>
                <input
                  type="email"
                  className="input"
                  value={settings.support_email || ''}
                  onChange={(e) => handleChange('support_email', e.target.value)}
                  placeholder="support@silverbytestudios.com"
                />
              </div>
            </div>

            {/* Live Hero Banner Simulator */}
            <div style={{ marginTop: 'var(--space-4)', padding: '20px 24px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 100%)', color: 'white', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, fontWeight: 700 }}>
                Storefront Hero Banner Preview
              </span>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                {settings.featured_banner_title || 'Discover Amazing Apps'}
              </div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                {settings.featured_banner_subtitle || 'A personal Apps and Games store by Silver Byte Studios.'}
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--color-divider)', margin: 'var(--space-4) 0' }} />

            <h3 className={styles.sectionHeader}>Download Policies</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={settings.enable_downloads === 'true'}
                  onChange={(e) => handleChange('enable_downloads', e.target.checked ? 'true' : 'false')}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                />
                <span>Enable public download of APK / application binaries</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={settings.require_auth_for_downloads === 'true'}
                  onChange={(e) => handleChange('require_auth_for_downloads', e.target.checked ? 'true' : 'false')}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                />
                <span>Require authentication before initiating download</span>
              </label>
            </div>
          </div>
        )}

        {/* Tab 2: GitHub Releases Storage */}
        {activeTab === 'storage' && (
          <div className={styles.tabBody}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 className={styles.sectionHeader}>
                  {storageStatus?.activeBackend === 'r2' ? 'Cloudflare R2 Storage' : 'GitHub Releases Storage Integration'}
                </h3>
                <p className={styles.helpText}>
                  {storageStatus?.activeBackend === 'r2'
                    ? 'Stores APK build binaries, icons, graphics, and screenshots in a Cloudflare R2 bucket. Uploads go straight from your browser to R2, and downloads have no egress fees. Files uploaded earlier to GitHub Releases keep working.'
                    : 'Stores APK build binaries, icons, graphics, and screenshots directly in GitHub Releases with permanent unmetered CDN URLs and 2 GB per file limits.'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={checkStorageConnection}
                disabled={isCheckingStorage}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={14} className={isCheckingStorage ? 'animate-spin' : ''} />
                <span>{isCheckingStorage ? 'Testing Connection...' : 'Test Storage Connection'}</span>
              </button>
            </div>

            {/* Connection Status Banner */}
            {storageStatus && (
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: storageStatus.connected ? '#E8F5E9' : '#FFEBEE',
                  border: `1px solid ${storageStatus.connected ? '#C8E6C9' : '#FFCDD2'}`,
                  color: storageStatus.connected ? '#2E7D32' : '#C62828',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {storageStatus.connected ? (
                  <CheckCircle2 size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <AlertCircle size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    Status: {storageStatus.status}
                  </div>
                  <div style={{ fontSize: '0.8125rem', opacity: 0.9 }}>
                    {storageStatus.connected && storageStatus.activeBackend === 'r2'
                      ? `Connected to R2 bucket "${storageStatus.bucket}" with ${storageStatus.assetCount} stored files (${formatFileSize(storageStatus.totalBytes || 0)}), served from ${storageStatus.publicUrl}.`
                      : storageStatus.connected
                      ? `Connected to repository "${storageStatus.repo}" with ${storageStatus.assetCount} stored release assets (${formatFileSize(storageStatus.totalBytes || 0)}). Direct GitHub CDN downloads are fully operational.`
                      : storageStatus.message}
                  </div>
                  {storageStatus.warning && (
                    <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#B71C1C', fontWeight: 500 }}>
                      ⚠️ {storageStatus.warning}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Configuration Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)', background: 'var(--color-gray-50)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
                  {storageStatus?.activeBackend === 'r2' ? 'Target Bucket' : 'Target Repository'}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginTop: 4 }}>
                  {storageStatus?.bucket || storageStatus?.repo || 'Not Configured'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {storageStatus?.activeBackend === 'r2'
                    ? storageStatus?.publicUrl || 'Public bucket URL'
                    : storageStatus?.private ? 'Private Repository' : 'Public Repository (Fast Direct CDN)'}
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)', background: 'var(--color-gray-50)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
                  Active Storage Backend
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginTop: 4, textTransform: 'capitalize' }}>
                  {storageStatus?.activeBackend === 'r2'
                    ? 'Cloudflare R2 (Cloud)'
                    : storageStatus?.activeBackend === 'github'
                    ? 'GitHub Releases (Cloud)'
                    : 'Local Disk (Fallback)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Unmetered egress & high availability
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)', background: 'var(--color-gray-50)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
                  Total Stored Assets
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: 4 }}>
                  {storageStatus?.assetCount ?? 0} files ({formatFileSize(storageStatus?.totalBytes ?? 0)})
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  APKs, release binaries, icons, screenshots
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                    Storage Integrity & Audit Diagnostics
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Scan all database records against actual storage objects to identify broken references or orphaned binaries.
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={runStorageAudit}
                  disabled={isAuditing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Activity size={14} className={isAuditing ? 'animate-spin' : ''} />
                  <span>{isAuditing ? 'Auditing Storage...' : 'Run Storage Audit'}</span>
                </button>
              </div>

              {auditData && (
                <div style={{ marginTop: 8, padding: 14, backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Active Backend</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)', textTransform: 'capitalize' }}>{auditData.backend}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Checked References</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{auditData.summary?.referencesChecked ?? 0} files</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Healthy Links</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>{auditData.summary?.ok ?? 0} ok</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Missing Objects</span>
                      <div style={{ fontWeight: 600, color: (auditData.summary?.missing ?? 0) > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                        {auditData.summary?.missing ?? 0} missing
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Orphaned Stored Objects</span>
                      <div style={{ fontWeight: 600, color: (auditData.summary?.orphanedObjects ?? 0) > 0 ? 'var(--color-warning)' : 'var(--color-text)' }}>
                        {auditData.summary?.orphanedObjects ?? 0} ({formatFileSize(auditData.summary?.orphanedBytes ?? 0)})
                      </div>
                    </div>
                  </div>

                  {auditData.summary?.missing === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--color-success)' }}>
                      <CheckCircle2 size={16} />
                      <span>All database references match active files in storage perfectly.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--color-danger)' }}>
                      <AlertCircle size={16} />
                      <span>{auditData.summary?.missing} file references could not be located in storage.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                How GitHub Releases Storage works with your App Store:
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.5 }}>
                <li><strong>Unmetered CDN Downloads:</strong> Release assets are hosted and served directly from GitHub&apos;s global CDN with zero bandwidth or egress fees.</li>
                <li><strong>2 GB File Size Limit:</strong> APK binaries up to 2 GB per file can be uploaded and distributed easily.</li>
                <li><strong>Stream Uploads:</strong> Large build files stream directly to GitHub without holding large payloads in server memory.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: Announcement Banner */}
        {activeTab === 'announcement' && (
          <div className={styles.tabBody}>
            <h3 className={styles.sectionHeader}>Storefront Announcement Bar</h3>
            <p className={styles.helpText}>
              Display a top notification banner across the public store for maintenance, new releases, or announcements.
            </p>

            <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={settings.store_announcement_enabled === 'true'}
                  onChange={(e) => handleChange('store_announcement_enabled', e.target.checked ? 'true' : 'false')}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                />
                <strong>Show Announcement Banner on Storefront</strong>
              </label>

              <div className="input-group">
                <label className="input-label">Announcement Banner Text</label>
                <textarea
                  rows={3}
                  className="textarea"
                  value={settings.store_announcement || ''}
                  onChange={(e) => handleChange('store_announcement', e.target.value)}
                  placeholder="e.g. 🎉 Pixel Quest v2.0 Grand Finale update is now available! Download now."
                />
              </div>

              {settings.store_announcement && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary-bg)',
                    border: '1px solid var(--color-primary-lighter)',
                    color: 'var(--color-primary-dark)',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Megaphone size={18} />
                  <span><strong>Preview:</strong> {settings.store_announcement}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Legal Pages */}
        {activeTab === 'legal' && (
          <div className={styles.tabBody}>
            <h3 className={styles.sectionHeader}>Legal Documentation (Markdown)</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div className="input-group">
                <label className="input-label">Privacy Policy</label>
                <textarea
                  rows={6}
                  className="textarea"
                  value={settings.privacy_policy || ''}
                  onChange={(e) => handleChange('privacy_policy', e.target.value)}
                  placeholder="Privacy policy content..."
                />
              </div>

              <div className="input-group">
                <label className="input-label">Terms of Service</label>
                <textarea
                  rows={6}
                  className="textarea"
                  value={settings.terms_of_service || ''}
                  onChange={(e) => handleChange('terms_of_service', e.target.value)}
                  placeholder="Terms of service content..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
