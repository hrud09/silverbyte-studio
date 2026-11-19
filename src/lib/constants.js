/**
 * Silver Red Store — Platform Constants
 */

export const PORTFOLIO_SETTING_KEY = 'portfolio_site_data';
export const PLATFORM_NAME = 'Silver Red Store';
export const DEVELOPER_NAME = 'Silver Byte Studios';
export const PLATFORM_DESCRIPTION = 'A personal Apps and Games store by Silver Byte Studios.';
export const PLATFORM_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://silverredstore.onrender.com';

export const APP_STATUSES = {
  PUBLISHED: 'PUBLISHED',
  DRAFT: 'DRAFT',
  ARCHIVED: 'ARCHIVED',
};

export const DEVELOPER_TYPES = {
  SILVER_BYTE: 'SILVER_BYTE',
  OTHER: 'OTHER',
};

export const DEVELOPER_TYPE_LABELS = {
  SILVER_BYTE: 'From Silver Byte Studios',
  OTHER: 'From Other Developers',
};

export const APP_TYPES = {
  NORMAL: 'NORMAL',
  MOD: 'MOD',
};

export const APP_TYPE_LABELS = {
  NORMAL: 'Normal Apps',
  MOD: 'Mod Apps',
};

export const TESTING_TRACKS = [
  { value: 'CLOSED_TESTING', label: 'Closed Testing (Google Play)' },
  { value: 'OPEN_TESTING', label: 'Open Testing (Google Play)' },
  { value: 'INTERNAL_TESTING', label: 'Internal Testing (Google Play)' },
  { value: 'BETA', label: 'Public Beta' },
  { value: 'WEB_PREVIEW', label: 'Web Early Access' },
];

export const VERSION_STATUSES = {
  PUBLISHED: 'PUBLISHED',
  DRAFT: 'DRAFT',
  DISABLED: 'DISABLED',
};

export const ASSET_TYPES = {
  ICON: 'ICON',
  FEATURE: 'FEATURE',
  SCREENSHOT: 'SCREENSHOT',
  PROMO: 'PROMO',
};

export const ANALYTICS_TYPES = {
  DOWNLOAD: 'DOWNLOAD',
  PAGE_VIEW: 'PAGE_VIEW',
  SEARCH: 'SEARCH',
};

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  DEVELOPER: 'DEVELOPER',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  ANALYST: 'ANALYST',
};

export const PLATFORMS = ['Android', 'iOS', 'Web', 'Windows', 'macOS', 'Linux'];

export const DEFAULT_CATEGORIES = [
  { name: 'Games', slug: 'games', icon: 'Gamepad2', color: '#D32F2F', order: 0 },
  { name: 'Productivity', slug: 'productivity', icon: 'BarChart3', color: '#1976D2', order: 1 },
  { name: 'Utilities', slug: 'utilities', icon: 'Wrench', color: '#388E3C', order: 2 },
  { name: 'Entertainment', slug: 'entertainment', icon: 'Tv', color: '#7B1FA2', order: 3 },
  { name: 'Tools', slug: 'tools', icon: 'Settings', color: '#F57C00', order: 4 },
  { name: 'Lifestyle', slug: 'lifestyle', icon: 'Heart', color: '#C2185B', order: 5 },
  { name: 'Education', slug: 'education', icon: 'GraduationCap', color: '#00796B', order: 6 },
  { name: 'Communication', slug: 'communication', icon: 'MessageSquare', color: '#303F9F', order: 7 },
];

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB for APKs

/**
 * Above this size a build is handed to the browser as a plain redirect to storage;
 * at or below it, the download is proxied through this server so the client can
 * report true byte-by-byte progress.
 *
 * GitHub's CDN sends no Access-Control-Allow-Origin, so a cross-origin download is
 * completely opaque to JavaScript — real progress is only observable when the bytes
 * pass through our own origin. That costs egress we otherwise wouldn't pay, and the
 * client holds the whole response in memory to save it, which a phone will not
 * survive at 500MB. The cap buys progress for ordinary builds while leaving large
 * ones on the unmetered path where the browser's own download manager handles them.
 */
export const PROXY_DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_PACKAGE_TYPES = ['.apk', '.aab', '.ipa', '.exe', '.msi', '.dmg', '.zip', '.tar.gz'];

export const ITEMS_PER_PAGE = 20;
