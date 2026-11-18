/**
 * Silver Red Store — Utility Functions
 */

/**
 * Generate a URL-safe slug from a string
 */
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

/**
 * Format a number with commas (e.g., 1,234,567)
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Compact number formatting (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
}

/**
 * Format a date as "Aug 14, 2026"
 */
export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return formatDate(date);
}

/**
 * Format date for datetime display "Aug 14, 2026 at 3:45 PM"
 */
export function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get status badge configuration
 */
export function getStatusConfig(status) {
  const configs = {
    PUBLISHED: { label: 'Published', className: 'badge-success' },
    DRAFT: { label: 'Draft', className: 'badge-warning' },
    ARCHIVED: { label: 'Archived', className: 'badge-neutral' },
    DISABLED: { label: 'Disabled', className: 'badge-danger' },
  };
  return configs[status] || { label: status, className: 'badge-neutral' };
}

/**
 * Build the base URL for the application
 */
export function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return `http://localhost:${process.env.PORT || 3000}`;
}

/**
 * Create API response helper
 */
export function apiResponse(data, status = 200) {
  return Response.json({ success: true, data }, { status });
}

/**
 * Create API error response helper
 */
export function apiError(message, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * Validate required fields and return missing ones
 */
export function validateRequired(body, fields) {
  const missing = fields.filter(f => !body[f] && body[f] !== 0 && body[f] !== false);
  return missing;
}

/**
 * Generate a random color from a predefined palette
 */
export function randomColor() {
  const colors = ['#D32F2F', '#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#00796B', '#C2185B', '#303F9F'];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

/**
 * Compare semantic version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Debounce function
 */
export function debounce(fn, ms = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Get the latest published version from a versions array
 */
export function getLatestVersion(versions) {
  if (!versions || versions.length === 0) return null;
  const published = versions.filter(v => v.status === 'PUBLISHED');
  if (published.length === 0) return versions[0];
  return published.sort((a, b) => b.versionCode - a.versionCode)[0];
}

/**
 * Calculate storage usage in bytes from an array of versions
 */
export function calculateStorageUsage(versions) {
  if (!versions) return 0;
  return versions.reduce((total, v) => total + (v.fileSize || 0), 0);
}

/**
 * Normalize a raw stored media URL (GitHub Releases, local, relative) into a valid web URL.
 * Returns '' if there's nothing to normalize — callers decide what "missing" looks like.
 */
export function normalizeMediaUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }
  if (clean.startsWith('/api/files/') || clean.startsWith('/api/placeholder/')) {
    return clean;
  }
  // Convert relative / local paths (/icon/..., /uploads/..., /builds/..., icon/...) to unified /api/files/...
  const cleanKey = clean.replace(/^\/+/, '');
  return `/api/files/${cleanKey}`;
}

/**
 * Resolve any media URL (GitHub Releases, local, relative, placeholder) to a valid web URL,
 * falling back to a generated placeholder when nothing real is stored yet.
 */
export function resolveMediaUrl(url, slug = 'app', type = 'icon', index = 1) {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) {
    return `/api/placeholder/${type}/${slug || 'app'}${type === 'screenshot' ? `/${index}` : ''}`;
  }
  return normalized;
}

/**
 * Helper to get the canonical app icon URL with reliable fallback
 */
export function getAppIconUrl(app) {
  if (!app) return '/api/placeholder/icon/app';
  const iconAsset = Array.isArray(app.assets) ? app.assets.find((a) => a && a.type === 'ICON') : null;
  const rawUrl = iconAsset?.url || app.iconUrl || (typeof app.icon === 'string' && app.icon.includes('/') ? app.icon : null);
  return resolveMediaUrl(rawUrl, app.slug, 'icon');
}

/**
 * Helper to get the canonical app feature graphic URL with reliable fallback
 */
export function getAppFeatureUrl(app) {
  if (!app) return '/api/placeholder/feature/app';
  const featureAsset = Array.isArray(app.assets) ? app.assets.find((a) => a && a.type === 'FEATURE') : null;
  const rawUrl = featureAsset?.url || app.featureUrl;
  return resolveMediaUrl(rawUrl, app.slug, 'feature');
}

/**
 * Get quick share short download link for an app
 */
export function getAppQuickShareUrl(slug, origin = '') {
  if (!slug) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/d/${slug}`;
}

/**
 * Get direct APK download URL for an app
 */
export function getAppDirectDownloadUrl(slug, origin = '') {
  if (!slug) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/api/apps/${slug}/download`;
}

/**
 * Get full store page URL for an app
 */
export function getAppStoreUrl(slug, origin = '') {
  if (!slug) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/apps/${slug}`;
}

