'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Info,
  Image as ImageIcon,
  Globe,
  Layers,
  UploadCloud,
  X,
  Plus,
  Trash2,
  Eye,
  Edit3,
  ExternalLink,
  Smartphone,
  Save,
  Link2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FlaskConical,
  Building2,
  Users,
  Sparkles,
  Mail,
  FileText,
  Check,
} from 'lucide-react';
import { useToast } from './ToastContext';
import { slugify, formatDate, formatFileSize, normalizeMediaUrl as normalizeStoredUrl } from '@/lib/utils';
import { APP_STATUSES, TESTING_TRACKS, MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES, DEVELOPER_TYPES, APP_TYPES } from '@/lib/constants';
import { uploadFileWithProgress } from '@/lib/uploadClient';
import AssetDropzone from './AssetDropzone';
import ReleaseFormModal from './ReleaseFormModal';
import styles from './AppForm.module.css';

// Accepts either a raw URL string or an { url } asset object
function normalizeMediaUrl(item) {
  if (item && typeof item === 'object') item = item.url || '';
  return normalizeStoredUrl(item);
}

// Minimal, safe markdown-lite renderer: bold/italic/lists/paragraphs only.
// Input is HTML-escaped before any tag is applied, so this never introduces raw user HTML.
function renderMarkdownLite(text) {
  if (!text || !text.trim()) return '<p class="empty">No description provided.</p>';

  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inlineFormat = (line) =>
    line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

  const lines = escapeHtml(text).split('\n');
  const parts = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        parts.push('<ul>');
        inList = true;
      }
      parts.push(`<li>${inlineFormat(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (inList) {
      parts.push('</ul>');
      inList = false;
    }
    if (line === '') continue;
    parts.push(`<p>${inlineFormat(line)}</p>`);
  }
  if (inList) parts.push('</ul>');

  return parts.join('');
}

const MAX_SCREENSHOTS = 8;

export default function AppForm({
  initialData = null, // null for create, object for edit
  categories = [],
  isEdit = false,
  initialTab = 'general',
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab); // 'general' | 'media' | 'store' | 'releases'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Tab 1: General Info & Major Classifications
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [isSlugManual, setIsSlugManual] = useState(Boolean(initialData?.slug));
  const [packageId, setPackageId] = useState(initialData?.packageId || '');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || '');
  const [fullDescription, setFullDescription] = useState(initialData?.fullDescription || '');
  
  // Major Classification: Developer Source
  const [developerType, setDeveloperType] = useState(initialData?.developerType || 'SILVER_BYTE'); // 'SILVER_BYTE' | 'OTHER'
  const [developerName, setDeveloperName] = useState(
    initialData?.developerName || (initialData?.developerType === 'OTHER' ? '' : 'Silver Byte Studios')
  );
  const [developerWebsite, setDeveloperWebsite] = useState(initialData?.developerWebsite || '');
  const [developerEmail, setDeveloperEmail] = useState(initialData?.developerEmail || '');
  const [developerDetails, setDeveloperDetails] = useState(initialData?.developerDetails || '');

  // Major Classification: App Type (Normal vs Mod)
  const [appType, setAppType] = useState(initialData?.appType || 'NORMAL'); // 'NORMAL' | 'MOD'
  const [modDetails, setModDetails] = useState(initialData?.modDetails || '');

  const [categoryId, setCategoryId] = useState(initialData?.categoryId || (categories[0]?.id || ''));
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(
    initialData?.tags ? (typeof initialData.tags === 'string' ? initialData.tags.split(',').map((t) => t.trim()).filter(Boolean) : initialData.tags) : []
  );

  // Slug availability check
  const [slugStatus, setSlugStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'taken'

  // Tab 2: Graphics & Media
  const [iconUrl, setIconUrl] = useState(() => {
    const asset = Array.isArray(initialData?.assets) ? initialData.assets.find((a) => a?.type === 'ICON') : null;
    return normalizeMediaUrl(asset?.url || asset);
  });
  const [iconPreview, setIconPreview] = useState(() => {
    const asset = Array.isArray(initialData?.assets) ? initialData.assets.find((a) => a?.type === 'ICON') : null;
    return normalizeMediaUrl(asset?.url || asset);
  });

  const [featureUrl, setFeatureUrl] = useState(() => {
    const asset = Array.isArray(initialData?.assets) ? initialData.assets.find((a) => a?.type === 'FEATURE') : null;
    return normalizeMediaUrl(asset?.url || asset);
  });
  const [featurePreview, setFeaturePreview] = useState(() => {
    const asset = Array.isArray(initialData?.assets) ? initialData.assets.find((a) => a?.type === 'FEATURE') : null;
    return normalizeMediaUrl(asset?.url || asset);
  });

  const [screenshots, setScreenshots] = useState(() => {
    if (!Array.isArray(initialData?.assets)) return [];
    return initialData.assets
      .filter((a) => a && a.type === 'SCREENSHOT')
      .map((a) => ({
        url: normalizeMediaUrl(a.url || a),
        preview: normalizeMediaUrl(a.url || a),
      }))
      .filter((a) => Boolean(a.url));
  });

  // Uploading states
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconProgress, setIconProgress] = useState(0);
  const [uploadingFeature, setUploadingFeature] = useState(false);
  const [featureProgress, setFeatureProgress] = useState(0);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotProgress, setScreenshotProgress] = useState(0);

  // URL input toggles
  const [showIconUrlInput, setShowIconUrlInput] = useState(false);
  const [showFeatureUrlInput, setShowFeatureUrlInput] = useState(false);
  const [showScreenshotUrlInput, setShowScreenshotUrlInput] = useState(false);
  const [customScreenshotUrl, setCustomScreenshotUrl] = useState('');

  // Tab 3: Store & Visibility
  const [status, setStatus] = useState(initialData?.status || 'DRAFT');
  const [featured, setFeatured] = useState(Boolean(initialData?.featured));
  const [featuredOrder, setFeaturedOrder] = useState(initialData?.featuredOrder || 0);
  const [website, setWebsite] = useState(initialData?.website || '');
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(initialData?.privacyPolicyUrl || '');
  const [supportUrl, setSupportUrl] = useState(initialData?.supportUrl || '');
  const [playStoreUrl, setPlayStoreUrl] = useState(initialData?.playStoreUrl || '');
  const [playStoreWebUrl, setPlayStoreWebUrl] = useState(initialData?.playStoreWebUrl || '');
  const [webAppUrl, setWebAppUrl] = useState(initialData?.webAppUrl || '');
  const [isTesting, setIsTesting] = useState(Boolean(initialData?.isTesting));
  const [testingTrack, setTestingTrack] = useState(initialData?.testingTrack || 'CLOSED_TESTING');
  const [testingInstructions, setTestingInstructions] = useState(initialData?.testingInstructions || '');

  // Tab 4: Releases (local state from initialData or updated)
  const [versions, setVersions] = useState(initialData?.versions || []);

  const nameFieldRef = useRef(null);
  const slugFieldRef = useRef(null);
  const packageFieldRef = useRef(null);
  const shortDescFieldRef = useRef(null);

  // --- Unsaved-changes tracking ---
  const isDirtyRef = useRef(false);
  const hasMountedRef = useRef(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    isDirtyRef.current = true;
  }, [
    name, slug, packageId, shortDescription, fullDescription, developerType, developerName,
    developerWebsite, developerEmail, developerDetails, appType, modDetails, categoryId, tags,
    iconUrl, featureUrl, screenshots, status, featured, featuredOrder, website, privacyPolicyUrl, supportUrl,
    playStoreUrl, playStoreWebUrl, webAppUrl, isTesting, testingTrack, testingInstructions,
  ]);

  useEffect(() => {
    const handler = (e) => {
      if (isDirtyRef.current && !savedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const confirmDiscardIfDirty = () => {
    if (!isDirtyRef.current) return true;
    return window.confirm('You have unsaved changes. Leave this page without saving?');
  };

  // Sync state if initialData changes after mount
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSlug(initialData.slug || '');
      setIsSlugManual(Boolean(initialData.slug));
      setPackageId(initialData.packageId || '');
      setShortDescription(initialData.shortDescription || '');
      setFullDescription(initialData.fullDescription || '');
      setDeveloperType(initialData.developerType || 'SILVER_BYTE');
      setDeveloperName(initialData.developerName || (initialData.developerType === 'OTHER' ? '' : 'Silver Byte Studios'));
      setDeveloperWebsite(initialData.developerWebsite || '');
      setDeveloperEmail(initialData.developerEmail || '');
      setDeveloperDetails(initialData.developerDetails || '');
      setAppType(initialData.appType || 'NORMAL');
      setModDetails(initialData.modDetails || '');
      if (initialData.categoryId) setCategoryId(initialData.categoryId);
      setTags(
        initialData.tags
          ? typeof initialData.tags === 'string'
            ? initialData.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : initialData.tags
          : []
      );
      const iconAsset = Array.isArray(initialData.assets) ? initialData.assets.find((a) => a?.type === 'ICON') : null;
      const normalizedIcon = normalizeMediaUrl(iconAsset?.url || iconAsset);
      setIconUrl(normalizedIcon);
      setIconPreview(normalizedIcon);

      const featureAsset = Array.isArray(initialData.assets) ? initialData.assets.find((a) => a?.type === 'FEATURE') : null;
      const normalizedFeature = normalizeMediaUrl(featureAsset?.url || featureAsset);
      setFeatureUrl(normalizedFeature);
      setFeaturePreview(normalizedFeature);

      if (Array.isArray(initialData.assets)) {
        setScreenshots(
          initialData.assets
            .filter((a) => a && a.type === 'SCREENSHOT')
            .map((a) => {
              const u = normalizeMediaUrl(a.url || a);
              return { url: u, preview: u };
            })
            .filter((a) => Boolean(a.url))
        );
      } else {
        setScreenshots([]);
      }
      setStatus(initialData.status || 'DRAFT');
      setFeatured(Boolean(initialData.featured));
      setFeaturedOrder(initialData.featuredOrder || 0);
      setWebsite(initialData.website || '');
      setPrivacyPolicyUrl(initialData.privacyPolicyUrl || '');
      setSupportUrl(initialData.supportUrl || '');
      setPlayStoreUrl(initialData.playStoreUrl || '');
      setPlayStoreWebUrl(initialData.playStoreWebUrl || '');
      setWebAppUrl(initialData.webAppUrl || '');
      setIsTesting(Boolean(initialData.isTesting));
      setTestingTrack(initialData.testingTrack || 'CLOSED_TESTING');
      setTestingInstructions(initialData.testingInstructions || '');
      setVersions(initialData.versions || []);
    }
  }, [initialData]);

  const handleAutoFillPlayStore = () => {
    const pkg = packageId.trim();
    if (!pkg) {
      toast.warning('Please enter a Package ID first in the General tab');
      return;
    }
    setPlayStoreUrl(`https://play.google.com/store/apps/details?id=${pkg}`);
    setPlayStoreWebUrl(`https://play.google.com/apps/testing/${pkg}`);
    setIsTesting(true);
    toast.success('Generated Google Play testing links from Package ID!');
  };

  // Debounced slug availability check
  useEffect(() => {
    const trimmed = slug.trim();
    if (!trimmed) {
      setSlugStatus('idle');
      return;
    }
    if (isEdit && trimmed === initialData?.slug) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/apps/${encodeURIComponent(slugify(trimmed))}`);
        if (res.status === 404) {
          setSlugStatus('available');
        } else if (res.ok) {
          setSlugStatus('taken');
        } else {
          setSlugStatus('idle');
        }
      } catch {
        setSlugStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, isEdit, initialData?.slug]);

  // Auto-generate slug and default package ID when name changes if not manually set
  const handleNameChange = (val) => {
    setName(val);
    if (!isSlugManual && !isEdit) {
      const generatedSlug = slugify(val);
      setSlug(generatedSlug);
      if (!packageId || packageId.startsWith('com.silverbyte.')) {
        setPackageId(generatedSlug ? `com.silverbyte.${generatedSlug.replace(/-/g, '')}` : '');
      }
    }
  };

  // Tag addition
  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,/g, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tToRemove) => {
    setTags(tags.filter((t) => t !== tToRemove));
  };

  // Media file uploads with instant local preview caching & progress tracking
  const handleFileUpload = async (filesOrFile, type) => {
    if (!filesOrFile) return;

    if (type === 'ICON') {
      const file = Array.isArray(filesOrFile) ? filesOrFile[0] : filesOrFile;
      if (!file) return;
      const blobUrl = URL.createObjectURL(file);
      setIconPreview(blobUrl);
      setUploadingIcon(true);
      setIconProgress(0);

      try {
        toast.info(`Uploading app icon...`, 'Media Upload');
        const result = await uploadFileWithProgress({
          file,
          folder: 'icon',
          onProgress: (percent) => setIconProgress(percent),
        });

        const finalUrl = normalizeMediaUrl(result.url);
        setIconUrl(finalUrl);
        toast.success(`App icon uploaded successfully`);
      } catch (err) {
        console.error('Icon upload error:', err);
        toast.error(err.message || 'Icon upload failed');
        setIconPreview(iconUrl);
      } finally {
        setUploadingIcon(false);
      }
    } else if (type === 'FEATURE') {
      const file = Array.isArray(filesOrFile) ? filesOrFile[0] : filesOrFile;
      if (!file) return;
      const blobUrl = URL.createObjectURL(file);
      setFeaturePreview(blobUrl);
      setUploadingFeature(true);
      setFeatureProgress(0);

      try {
        toast.info(`Uploading feature banner...`, 'Media Upload');
        const result = await uploadFileWithProgress({
          file,
          folder: 'feature',
          onProgress: (percent) => setFeatureProgress(percent),
        });

        const finalUrl = normalizeMediaUrl(result.url);
        setFeatureUrl(finalUrl);
        toast.success(`Feature graphic uploaded successfully`);
      } catch (err) {
        console.error('Feature graphic upload error:', err);
        toast.error(err.message || 'Feature graphic upload failed');
        setFeaturePreview(featureUrl);
      } finally {
        setUploadingFeature(false);
      }
    } else if (type === 'SCREENSHOT') {
      const fileList = Array.isArray(filesOrFile) ? filesOrFile : Array.from(filesOrFile);
      if (fileList.length === 0) return;

      const remainingSlots = MAX_SCREENSHOTS - screenshots.length;
      if (remainingSlots <= 0) {
        toast.warning(`You can add up to ${MAX_SCREENSHOTS} screenshots.`);
        return;
      }
      const filesToUpload = fileList.slice(0, remainingSlots);
      if (fileList.length > filesToUpload.length) {
        toast.warning(`Only ${remainingSlots} more screenshot(s) can be added (max ${MAX_SCREENSHOTS}).`);
      }

      setUploadingScreenshot(true);
      setScreenshotProgress(0);

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const blobUrl = URL.createObjectURL(file);

        // Add immediate local preview placeholder
        setScreenshots((prev) => [...prev, { url: '', preview: blobUrl, uploading: true }]);

        try {
          const result = await uploadFileWithProgress({
            file,
            folder: 'screenshot',
            onProgress: (percent) => {
              const overallPercent = Math.round(((i + percent / 100) / filesToUpload.length) * 100);
              setScreenshotProgress(overallPercent);
            },
          });

          const finalUrl = normalizeMediaUrl(result.url);
          setScreenshots((prev) => {
            const next = [...prev];
            const foundIndex = next.findIndex((s) => s.preview === blobUrl);
            if (foundIndex !== -1) {
              next[foundIndex] = { url: finalUrl, preview: blobUrl, uploading: false };
            }
            return next;
          });
        } catch (err) {
          console.error('Screenshot upload error:', err);
          toast.error(err.message || `"${file.name}" failed to upload`);
          // Don't leave a permanently-spinning ghost thumbnail — mark it as a
          // removable error state instead of pretending the upload is still in flight.
          setScreenshots((prev) => {
            const next = [...prev];
            const foundIndex = next.findIndex((s) => s.preview === blobUrl);
            if (foundIndex !== -1) {
              next[foundIndex] = { url: '', preview: blobUrl, uploading: false, error: true };
            }
            return next;
          });
        }
      }

      setUploadingScreenshot(false);
    }
  };

  const handleValidationError = (message) => toast.error(message);

  const handleAddCustomScreenshot = () => {
    const val = customScreenshotUrl.trim();
    if (!val) return;
    if (screenshots.length >= MAX_SCREENSHOTS) {
      toast.warning(`You can add up to ${MAX_SCREENSHOTS} screenshots.`);
      return;
    }
    const normalized = normalizeMediaUrl(val);
    setScreenshots((prev) => [...prev, { url: normalized, preview: normalized, uploading: false }]);
    setCustomScreenshotUrl('');
    setShowScreenshotUrlInput(false);
  };

  const moveScreenshot = (index, direction) => {
    setScreenshots((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  // Free the underlying storage object instead of only clearing local state, so
  // removed assets don't linger orphaned in storage/local disk.
  const releaseStoredAsset = async (url) => {
    if (!url || url.startsWith('blob:') || url.startsWith('/api/placeholder/')) return;
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch (err) {
      console.warn('Could not delete stored asset:', err.message);
    }
  };

  const handleRemoveIcon = () => {
    releaseStoredAsset(iconUrl);
    setIconUrl('');
    setIconPreview('');
  };

  const handleRemoveFeature = () => {
    releaseStoredAsset(featureUrl);
    setFeatureUrl('');
    setFeaturePreview('');
  };

  const handleRemoveScreenshot = (idx) => {
    const removed = screenshots[idx];
    if (removed?.url) releaseStoredAsset(removed.url);
    setScreenshots(screenshots.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = true;
    if (!slug.trim()) errors.slug = true;
    if (!packageId.trim()) errors.packageId = true;
    if (!shortDescription.trim()) errors.shortDescription = true;
    if (developerType === 'OTHER' && !developerName.trim()) errors.developerName = true;
    return errors;
  };

  const fieldRefs = {
    name: nameFieldRef,
    slug: slugFieldRef,
    packageId: packageFieldRef,
    shortDescription: shortDescFieldRef,
  };

  const handleSubmit = async (e, forcedStatus) => {
    if (e) e.preventDefault();

    if (uploadingIcon || uploadingFeature || uploadingScreenshot) {
      toast.warning('Please wait for media uploads to finish before saving');
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setActiveTab('general');
      toast.error('Please fix the highlighted fields before saving');
      const firstErrorField = ['name', 'slug', 'packageId', 'shortDescription', 'developerName'].find((f) => errors[f]);
      if (firstErrorField && fieldRefs[firstErrorField]?.current) {
        requestAnimationFrame(() => fieldRefs[firstErrorField]?.current?.focus());
      }
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);

    const effectiveStatus = forcedStatus || status;

    // Collect all normalized assets
    const assetsPayload = [];
    if (iconUrl && iconUrl.trim()) {
      assetsPayload.push({
        type: 'ICON',
        url: normalizeMediaUrl(iconUrl.trim()),
        order: 0,
        fileName: 'icon.png',
      });
    }
    if (featureUrl && featureUrl.trim()) {
      assetsPayload.push({
        type: 'FEATURE',
        url: normalizeMediaUrl(featureUrl.trim()),
        order: 0,
        fileName: 'feature.png',
      });
    }
    screenshots.forEach((sc, idx) => {
      const rawUrl = typeof sc === 'string' ? sc : sc?.url || sc?.preview;
      if (rawUrl && rawUrl.trim() && !rawUrl.startsWith('blob:')) {
        assetsPayload.push({
          type: 'SCREENSHOT',
          url: normalizeMediaUrl(rawUrl.trim()),
          order: idx,
          fileName: `screenshot-${idx + 1}.png`,
        });
      }
    });

    const effectiveDevName = developerType === 'OTHER' ? (developerName.trim() || 'Other Developer') : 'Silver Byte Studios';

    const payload = {
      name: name.trim(),
      slug: slug ? slugify(slug) : slugify(name),
      packageId: packageId.trim(),
      shortDescription: shortDescription.trim(),
      fullDescription: fullDescription.trim(),
      developerType: developerType === 'OTHER' ? 'OTHER' : 'SILVER_BYTE',
      developerName: effectiveDevName,
      developerWebsite: developerType === 'OTHER' ? (developerWebsite.trim() || null) : null,
      developerEmail: developerType === 'OTHER' ? (developerEmail.trim() || null) : null,
      developerDetails: developerType === 'OTHER' ? (developerDetails.trim() || null) : null,
      appType: appType === 'MOD' ? 'MOD' : 'NORMAL',
      modDetails: appType === 'MOD' ? (modDetails.trim() || null) : null,
      categoryId: categoryId || null,
      tags: tags.join(','),
      status: effectiveStatus,
      featured: Boolean(featured),
      featuredOrder: parseInt(featuredOrder, 10) || 0,
      website: website.trim() || null,
      privacyPolicyUrl: privacyPolicyUrl.trim() || null,
      supportUrl: supportUrl.trim() || null,
      playStoreUrl: playStoreUrl.trim() || null,
      playStoreWebUrl: playStoreWebUrl.trim() || null,
      webAppUrl: webAppUrl.trim() || null,
      isTesting: Boolean(isTesting || playStoreUrl.trim() || playStoreWebUrl.trim()),
      testingTrack: testingTrack || '',
      testingInstructions: testingInstructions.trim() || '',
      assets: assetsPayload,
    };

    try {
      const url = isEdit ? `/api/apps/${initialData.slug}` : '/api/apps';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // response was not JSON
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to save app listing (${res.status})`);
      }

      savedRef.current = true;
      toast.success(
        isEdit ? `Saved changes to ${name}!` : `Created ${name} as a draft!`
      );
      if (data.data?.warning) {
        toast.warning(data.data.warning);
      }

      if (isEdit) {
        router.push('/admin/apps');
      } else {
        // Continue straight into uploading the first build instead of dropping the
        // admin back at the list — they still need to attach a release to go live.
        toast.info('Now upload your first release build to make this app installable.', 'Next Step');
        router.push(`/admin/apps/${data.data.slug}/edit?tab=releases`);
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error saving application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseSuccess = (newRelease) => {
    setVersions((prev) => [newRelease, ...prev]);
  };

  const primaryLabel = isEdit
    ? 'Save Changes'
    : status === 'PUBLISHED'
    ? 'Publish App'
    : status === 'ARCHIVED'
    ? 'Save as Archived'
    : 'Save Draft';

  const generalTabHasError = Boolean(fieldErrors.name || fieldErrors.slug || fieldErrors.packageId || fieldErrors.shortDescription);
  const versionsWithNoFile = versions.filter((v) => !v.filePath).length;
  const latestVersion = versions[0] || null;

  return (
    <div className={styles.formContainer}>
      {/* Tab Navigation */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'general' ? styles.active : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <Info size={16} />
          <span>General Info</span>
          {generalTabHasError && <span className={styles.tabErrorDot} title="This tab has missing required fields" />}
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'media' ? styles.active : ''}`}
          onClick={() => setActiveTab('media')}
        >
          <ImageIcon size={16} />
          <span>Graphics & Media</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'store' ? styles.active : ''}`}
          onClick={() => setActiveTab('store')}
        >
          <Globe size={16} />
          <span>Store Listing & Visibility</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'releases' ? styles.active : ''}`}
          onClick={() => setActiveTab('releases')}
        >
          <Layers size={16} />
          <span>Releases ({versions.length})</span>
          {versionsWithNoFile > 0 && <span className={styles.tabErrorDot} title={`${versionsWithNoFile} release(s) missing a build file`} />}
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.active : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={16} />
          <span>Live Store Preview</span>
        </button>
      </div>

      <form onSubmit={(e) => handleSubmit(e)}>
        {/* Tab 1: General Info & Major Classifications */}
        {activeTab === 'general' && (
          <div className={styles.tabContent}>
            {/* Major Category Classification System */}
            <div className={styles.classificationCard}>
              <div className={styles.classificationHeader}>
                <Layers size={18} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <h3 className={styles.classificationTitle}>Major Category & Source Classification</h3>
                  <p className={styles.classificationSubtitle}>
                    Tag whether this app is an official studio release or from a community developer, and specify normal vs modded build.
                  </p>
                </div>
              </div>

              {/* 1. Developer Source Selection */}
              <div>
                <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>
                  1. Developer Origin <span className="required">*</span>
                </label>
                <div className={styles.tagSelectorGrid}>
                  <button
                    type="button"
                    className={`${styles.tagSelectBtn} ${developerType === 'SILVER_BYTE' ? styles.active : ''}`}
                    onClick={() => {
                      setDeveloperType('SILVER_BYTE');
                      setDeveloperName('Silver Byte Studios');
                    }}
                  >
                    <div className={styles.tagIconBox}>
                      <Building2 size={16} />
                    </div>
                    <div className={styles.tagContentCol}>
                      <span className={styles.tagTitle}>From Silver Byte Studios</span>
                      <span className={styles.tagDesc}>Official 1st-party Studio release</span>
                    </div>
                    {developerType === 'SILVER_BYTE' && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                  </button>

                  <button
                    type="button"
                    className={`${styles.tagSelectBtn} ${developerType === 'OTHER' ? styles.active : ''}`}
                    onClick={() => {
                      setDeveloperType('OTHER');
                      if (developerName === 'Silver Byte Studios') {
                        setDeveloperName('');
                      }
                    }}
                  >
                    <div className={styles.tagIconBox}>
                      <Users size={16} />
                    </div>
                    <div className={styles.tagContentCol}>
                      <span className={styles.tagTitle}>From Other Developers</span>
                      <span className={styles.tagDesc}>Third-party developer with custom details</span>
                    </div>
                    {developerType === 'OTHER' && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                  </button>
                </div>

                {/* Other Developer Details Fields */}
                {developerType === 'OTHER' && (
                  <div className={styles.developerDetailsBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Users size={15} color="var(--color-primary)" />
                      <strong style={{ fontSize: '0.8125rem' }}>Third-Party Developer Profile & Contact Details</strong>
                    </div>

                    <div className={styles.grid2}>
                      <div className="input-group">
                        <label className="input-label">
                          Developer / Studio Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Pixel Forge Labs"
                          className={`input ${fieldErrors.developerName ? styles.inputError : ''}`}
                          value={developerName}
                          onChange={(e) => {
                            setDeveloperName(e.target.value);
                            if (fieldErrors.developerName) setFieldErrors((prev) => ({ ...prev, developerName: false }));
                          }}
                          required
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Developer Website / Portfolio URL</label>
                        <input
                          type="url"
                          placeholder="https://pixelforgelabs.dev"
                          className="input"
                          value={developerWebsite}
                          onChange={(e) => setDeveloperWebsite(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className={styles.grid2}>
                      <div className="input-group">
                        <label className="input-label">Developer Email / Contact</label>
                        <input
                          type="email"
                          placeholder="contact@pixelforgelabs.dev"
                          className="input"
                          value={developerEmail}
                          onChange={(e) => setDeveloperEmail(e.target.value)}
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Developer Bio / Credits / Team Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Independent developer team focused on open-source utilities."
                          className="input"
                          value={developerDetails}
                          onChange={(e) => setDeveloperDetails(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. App Type Selection (Normal vs Mod) */}
              <div style={{ marginTop: 'var(--space-2)' }}>
                <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>
                  2. Application Type <span className="required">*</span>
                </label>
                <div className={styles.tagSelectorGrid}>
                  <button
                    type="button"
                    className={`${styles.tagSelectBtn} ${appType === 'NORMAL' ? styles.active : ''}`}
                    onClick={() => setAppType('NORMAL')}
                  >
                    <div className={styles.tagIconBox}>
                      <Smartphone size={16} />
                    </div>
                    <div className={styles.tagContentCol}>
                      <span className={styles.tagTitle}>Normal App</span>
                      <span className={styles.tagDesc}>Standard, unmodified production build</span>
                    </div>
                    {appType === 'NORMAL' && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                  </button>

                  <button
                    type="button"
                    className={`${styles.tagSelectBtn} ${appType === 'MOD' ? styles.modActive : ''}`}
                    onClick={() => setAppType('MOD')}
                  >
                    <div className={styles.tagIconBox}>
                      <Sparkles size={16} />
                    </div>
                    <div className={styles.tagContentCol}>
                      <span className={styles.tagTitle} style={appType === 'MOD' ? { color: '#d97706' } : {}}>
                        Mod App (MOD)
                      </span>
                      <span className={styles.tagDesc}>Modified, premium-unlocked or enhanced build</span>
                    </div>
                    {appType === 'MOD' && <Check size={16} style={{ color: '#d97706' }} />}
                  </button>
                </div>

                {/* Mod Details Input Field */}
                {appType === 'MOD' && (
                  <div className={styles.modDetailsBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={15} color="#d97706" />
                      <strong style={{ fontSize: '0.8125rem', color: '#b45309' }}>Modded Features & Highlights</strong>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                      <input
                        type="text"
                        placeholder="e.g. Unlocked Premium, No Ads, Unlimited Resources, Custom Themes Enabled"
                        className="input"
                        value={modDetails}
                        onChange={(e) => setModDetails(e.target.value)}
                      />
                      <span className={styles.helpText} style={{ color: '#b45309' }}>
                        These mod features will be highlighted on the storefront card and app detail page.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* App Identification Fields */}
            <div className={styles.grid2}>
              <div className="input-group">
                <label className="input-label">
                  App Name <span className="required">*</span>
                </label>
                <input
                  ref={nameFieldRef}
                  type="text"
                  placeholder="e.g. SB File Manager"
                  className={`input ${fieldErrors.name ? styles.inputError : ''}`}
                  value={name}
                  onChange={(e) => {
                    handleNameChange(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: false }));
                  }}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">
                  URL Slug <span className="required">*</span>
                </label>
                <input
                  ref={slugFieldRef}
                  type="text"
                  placeholder="e.g. sb-file-manager"
                  className={`input ${fieldErrors.slug ? styles.inputError : ''}`}
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setIsSlugManual(true);
                    if (fieldErrors.slug) setFieldErrors((prev) => ({ ...prev, slug: false }));
                  }}
                  required
                />
                <span className={styles.helpText}>
                  URL: /apps/{slug || 'your-slug'}
                  {slugStatus === 'checking' && (
                    <span className={styles.slugStatusChecking}>
                      {' '}<Loader2 size={11} className={styles.spinIcon} /> Checking...
                    </span>
                  )}
                  {slugStatus === 'available' && (
                    <span className={styles.slugStatusAvailable}> <CheckCircle2 size={11} /> Available</span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className={styles.slugStatusTaken}> <AlertCircle size={11} /> Already in use</span>
                  )}
                </span>
              </div>
            </div>

            <div className={styles.grid2}>
              <div className="input-group">
                <label className="input-label">
                  Package ID <span className="required">*</span>
                </label>
                <input
                  ref={packageFieldRef}
                  type="text"
                  placeholder="com.silverbyte.appname"
                  className={`input ${fieldErrors.packageId ? styles.inputError : ''}`}
                  value={packageId}
                  onChange={(e) => {
                    setPackageId(e.target.value);
                    if (fieldErrors.packageId) setFieldErrors((prev) => ({ ...prev, packageId: false }));
                  }}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Primary Category</label>
                <select
                  className="select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select a Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Tags & Keywords (comma separated)</label>
              <div className={styles.tagsWrapper}>
                {tags.map((t) => (
                  <span key={t} className={styles.tagPill}>
                    {t}
                    <button
                      type="button"
                      className={styles.tagRemove}
                      onClick={() => handleRemoveTag(t)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={tags.length === 0 ? 'Type tag and press Enter...' : ''}
                  className={styles.tagInput}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">
                  Short Description <span className="required">*</span>
                </label>
                <span className={styles.charCount}>{shortDescription.length}/80</span>
              </div>
              <input
                ref={shortDescFieldRef}
                type="text"
                maxLength={80}
                placeholder="A concise summary of what this app does (max 80 characters)"
                className={`input ${fieldErrors.shortDescription ? styles.inputError : ''}`}
                value={shortDescription}
                onChange={(e) => {
                  setShortDescription(e.target.value);
                  if (fieldErrors.shortDescription) setFieldErrors((prev) => ({ ...prev, shortDescription: false }));
                }}
              />
            </div>

            <div className="input-group">
              <div className={styles.descEditorHeader}>
                <label className="input-label">Full Description (Markdown supported)</label>
                <button
                  type="button"
                  className={styles.modeToggleBtn}
                  onClick={() => setPreviewMarkdown(!previewMarkdown)}
                >
                  {previewMarkdown ? <Edit3 size={14} /> : <Eye size={14} />}
                  <span>{previewMarkdown ? 'Edit' : 'Preview'}</span>
                </button>
              </div>

              {!previewMarkdown ? (
                <>
                  <textarea
                    rows={8}
                    placeholder="Detailed features, usage guidelines, changelog overview... Supports **bold**, *italic*, and - lists"
                    className="textarea"
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                  />
                  <span className={styles.helpText}>Supports **bold**, *italic*, and &quot;- &quot; bullet lists.</span>
                </>
              ) : (
                <div
                  className={styles.markdownPreview}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownLite(fullDescription) }}
                />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Graphics & Media */}
        {activeTab === 'media' && (
          <div className={styles.tabContent}>
            <div className={styles.mediaGrid}>
              {/* App Icon */}
              <div className={styles.iconBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label">App Icon (512x512)</label>
                  <button
                    type="button"
                    className={styles.urlToggleBtn}
                    onClick={() => setShowIconUrlInput(!showIconUrlInput)}
                  >
                    {showIconUrlInput ? 'Upload File' : 'Paste URL'}
                  </button>
                </div>

                <AssetDropzone
                  accept="image/*"
                  uploading={uploadingIcon}
                  progress={iconProgress}
                  maxSizeBytes={MAX_IMAGE_SIZE}
                  allowedTypes={ALLOWED_IMAGE_TYPES}
                  onFiles={(files) => handleFileUpload(files, 'ICON')}
                  onValidationError={handleValidationError}
                  className={styles.iconPreview}
                >
                  {(iconPreview || iconUrl) ? (
                    <img
                      src={iconPreview || iconUrl}
                      alt="App Icon Preview"
                      className={styles.iconImage}
                      onError={(e) => {
                        const currentSrc = e.currentTarget.src || '';
                        if (!currentSrc.includes('/api/placeholder/')) {
                          e.currentTarget.src = `/api/placeholder/icon/${slug || 'app'}`;
                        }
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 8, color: 'var(--color-text-tertiary)' }}>
                      <UploadCloud size={28} />
                      <div style={{ fontSize: '0.6875rem', marginTop: 4 }}>Upload Icon</div>
                    </div>
                  )}
                </AssetDropzone>

                {showIconUrlInput && (
                  <div className={styles.urlInputRow}>
                    <input
                      type="url"
                      placeholder="https://... or /api/files/..."
                      className="input"
                      style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                      value={typeof iconUrl === 'string' ? iconUrl : normalizeMediaUrl(iconUrl)}
                      onChange={(e) => {
                        setIconUrl(e.target.value);
                        setIconPreview(e.target.value);
                      }}
                    />
                  </div>
                )}

                {(iconUrl || iconPreview) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={handleRemoveIcon}
                    style={{ color: 'var(--color-danger)', alignSelf: 'flex-start' }}
                  >
                    Remove Icon
                  </button>
                )}
              </div>

              {/* Feature Graphic Banner */}
              <div className={styles.featureBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label">Feature Graphic / Promo Banner (1024x500)</label>
                  <button
                    type="button"
                    className={styles.urlToggleBtn}
                    onClick={() => setShowFeatureUrlInput(!showFeatureUrlInput)}
                  >
                    {showFeatureUrlInput ? 'Upload File' : 'Paste URL'}
                  </button>
                </div>

                <AssetDropzone
                  accept="image/*"
                  uploading={uploadingFeature}
                  progress={featureProgress}
                  maxSizeBytes={MAX_IMAGE_SIZE}
                  allowedTypes={ALLOWED_IMAGE_TYPES}
                  onFiles={(files) => handleFileUpload(files, 'FEATURE')}
                  onValidationError={handleValidationError}
                  className={styles.featurePreview}
                >
                  {(featurePreview || featureUrl) ? (
                    <img
                      src={featurePreview || featureUrl}
                      alt="Feature Graphic Preview"
                      className={styles.featureImage}
                      onError={(e) => {
                        const currentSrc = e.currentTarget.src || '';
                        if (!currentSrc.includes('/api/placeholder/')) {
                          e.currentTarget.src = `/api/placeholder/feature/${slug || 'app'}`;
                        }
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: 12, color: 'var(--color-text-tertiary)' }}>
                      <UploadCloud size={32} />
                      <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Click to upload 1024x500 Feature Banner</div>
                    </div>
                  )}
                </AssetDropzone>

                {showFeatureUrlInput && (
                  <div className={styles.urlInputRow}>
                    <input
                      type="url"
                      placeholder="https://... or /api/files/..."
                      className="input"
                      style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                      value={typeof featureUrl === 'string' ? featureUrl : normalizeMediaUrl(featureUrl)}
                      onChange={(e) => {
                        setFeatureUrl(e.target.value);
                        setFeaturePreview(e.target.value);
                      }}
                    />
                  </div>
                )}

                {(featureUrl || featurePreview) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={handleRemoveFeature}
                    style={{ color: 'var(--color-danger)', alignSelf: 'flex-start' }}
                  >
                    Remove Feature Graphic
                  </button>
                )}
              </div>
            </div>

            {/* Screenshots */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <label className="input-label">Screenshots ({screenshots.length}/{MAX_SCREENSHOTS})</label>
                  <p className={styles.helpText}>Add up to {MAX_SCREENSHOTS} portrait or landscape screenshots for the store listing.</p>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setShowScreenshotUrlInput(!showScreenshotUrlInput)}
                  >
                    <Link2 size={14} />
                    <span>{showScreenshotUrlInput ? 'Cancel URL' : 'Add via URL'}</span>
                  </button>
                </div>
              </div>

              {showScreenshotUrlInput && (
                <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-2)' }}>
                  <input
                    type="url"
                    placeholder="Enter image URL..."
                    className="input"
                    value={customScreenshotUrl}
                    onChange={(e) => setCustomScreenshotUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomScreenshot())}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleAddCustomScreenshot}
                  >
                    Add
                  </button>
                </div>
              )}

              {screenshots.length === 0 && !uploadingScreenshot ? (
                <AssetDropzone
                  accept="image/*"
                  multiple
                  maxSizeBytes={MAX_IMAGE_SIZE}
                  allowedTypes={ALLOWED_IMAGE_TYPES}
                  onFiles={(files) => handleFileUpload(files, 'SCREENSHOT')}
                  onValidationError={handleValidationError}
                  className="file-upload-zone"
                  hint={`Up to ${MAX_SCREENSHOTS} images`}
                  style={{ marginTop: 'var(--space-3)' }}
                >
                  <ImageIcon size={32} className="file-upload-zone-icon" />
                  <div className="file-upload-zone-text">
                    <strong>Click to upload</strong> or drag and drop screenshots
                  </div>
                </AssetDropzone>
              ) : (
                <>
                  <div className={styles.screenshotGrid}>
                    {screenshots.map((sc, idx) => {
                      const displaySrc = typeof sc === 'string' ? sc : sc.preview || sc.url;
                      if (!displaySrc) return null;
                      return (
                        <div key={idx} className={styles.screenshotCard}>
                          <img
                            src={displaySrc}
                            alt={`Screenshot ${idx + 1}`}
                            className={styles.screenshotImg}
                            onError={(e) => {
                              const currentSrc = e.currentTarget.src || '';
                              if (!currentSrc.includes('/api/placeholder/')) {
                                e.currentTarget.src = `/api/placeholder/screenshot/${slug || 'app'}/${idx + 1}`;
                              }
                            }}
                          />
                          {sc.uploading && (
                            <div className={styles.uploadOverlay}>
                              <div className={styles.uploadOverlaySpinner} />
                            </div>
                          )}
                          {sc.error && (
                            <div className={styles.screenshotErrorBadge} title="Upload failed">
                              <AlertCircle size={12} />
                              <span>Failed</span>
                            </div>
                          )}
                          <div className={styles.screenshotOverlay}>
                            {idx > 0 && (
                              <button
                                type="button"
                                className={styles.screenshotMoveBtn}
                                onClick={() => moveScreenshot(idx, -1)}
                                title="Move earlier"
                              >
                                <ChevronLeft size={13} />
                              </button>
                            )}
                            {idx < screenshots.length - 1 && (
                              <button
                                type="button"
                                className={styles.screenshotMoveBtn}
                                onClick={() => moveScreenshot(idx, 1)}
                                title="Move later"
                              >
                                <ChevronRight size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.screenshotDeleteBtn}
                              onClick={() => handleRemoveScreenshot(idx)}
                              title="Delete screenshot"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {screenshots.length < MAX_SCREENSHOTS && (
                    <AssetDropzone
                      accept="image/*"
                      multiple
                      compact
                      uploading={uploadingScreenshot}
                      progress={screenshotProgress}
                      maxSizeBytes={MAX_IMAGE_SIZE}
                      allowedTypes={ALLOWED_IMAGE_TYPES}
                      onFiles={(files) => handleFileUpload(files, 'SCREENSHOT')}
                      onValidationError={handleValidationError}
                      className="file-upload-zone"
                      style={{ marginTop: 'var(--space-3)' }}
                    >
                      <Plus size={18} className="file-upload-zone-icon" />
                      <div className="file-upload-zone-text">
                        <strong>Add more</strong> or drag and drop
                      </div>
                    </AssetDropzone>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Store Listing & Visibility */}
        {activeTab === 'store' && (
          <div className={styles.tabContent}>
            <div className={styles.grid2}>
              <div className="input-group">
                <label className="input-label">Publication Status</label>
                <select
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {Object.keys(APP_STATUSES).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <span className={styles.helpText}>
                  Draft apps are only visible to logged-in admins. Published apps are visible on the public store.
                  The save button below always matches this setting.
                </span>
              </div>

              <div className="input-group">
                <label className="input-label">Featured on Home Spotlight</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: '42px' }}>
                  <input
                    type="checkbox"
                    id="featuredCheckbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                  />
                  <label htmlFor="featuredCheckbox" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                    Feature this app in top carousel
                  </label>
                </div>
              </div>
            </div>

            {featured && (
              <div className="input-group" style={{ maxWidth: '320px' }}>
                <label className="input-label">Featured Order Priority</label>
                <input
                  type="number"
                  placeholder="0"
                  className="input"
                  value={featuredOrder}
                  onChange={(e) => setFeaturedOrder(e.target.value)}
                />
                <span className={styles.helpText}>Lower numbers appear first (0 = top position).</span>
              </div>
            )}

            <div style={{ height: 1, backgroundColor: 'var(--color-divider)', margin: 'var(--space-2) 0' }} />

            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>External & Legal Links</h4>

            <div className={styles.grid3}>
              <div className="input-group">
                <label className="input-label">Official Website URL</label>
                <input
                  type="url"
                  placeholder="https://silverbytestudios.com/apps/..."
                  className="input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Privacy Policy URL</label>
                <input
                  type="url"
                  placeholder="https://silverbytestudios.com/privacy"
                  className="input"
                  value={privacyPolicyUrl}
                  onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Support / Contact URL</label>
                <input
                  type="url"
                  placeholder="mailto:support@silverbytestudios.com"
                  className="input"
                  value={supportUrl}
                  onChange={(e) => setSupportUrl(e.target.value)}
                />
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: 'var(--color-divider)', margin: 'var(--space-2) 0' }} />

            {/* Google Play & Web Testing Tracks Card */}
            <div className={styles.testingSectionCard}>
              <div className={styles.testingSectionHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FlaskConical size={18} style={{ color: 'var(--color-primary)' }} />
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                    Google Play & Web Testing Track Links
                  </h4>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm btn-secondary ${styles.autoFillBtn}`}
                  onClick={handleAutoFillPlayStore}
                  title="Generate standard Play Store URLs using this app's Package ID"
                >
                  Auto-fill from Package ID
                </button>
              </div>

              <p className={styles.helpText} style={{ margin: 0 }}>
                Configure test links for closed, open, or internal testing on Google Play and live web demos. Testers can join directly from the store listing.
              </p>

              <div className={styles.grid2}>
                <div className="input-group">
                  <label className="input-label">Early Access / Testing Program</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: '42px' }}>
                    <input
                      type="checkbox"
                      id="isTestingCheckbox"
                      checked={isTesting}
                      onChange={(e) => setIsTesting(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor="isTestingCheckbox" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                      Mark as Early Access / Testing Release
                    </label>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Testing Track Name</label>
                  <select
                    className="select"
                    value={testingTrack}
                    onChange={(e) => setTestingTrack(e.target.value)}
                  >
                    {TESTING_TRACKS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="input-label">Play Store Direct App Link (Android)</label>
                    <button
                      type="button"
                      className={styles.urlToggleBtn}
                      onClick={() => packageId && setPlayStoreUrl(`https://play.google.com/store/apps/details?id=${packageId.trim()}`)}
                    >
                      Fill
                    </button>
                  </div>
                  <input
                    type="url"
                    placeholder="https://play.google.com/store/apps/details?id=com.example.app"
                    className="input"
                    value={playStoreUrl}
                    onChange={(e) => setPlayStoreUrl(e.target.value)}
                  />
                  <span className={styles.helpText}>
                    Direct link that opens Google Play on Android devices to download/update the testing build.
                  </span>
                </div>

                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="input-label">Play Store Web Opt-In Link (Web)</label>
                    <button
                      type="button"
                      className={styles.urlToggleBtn}
                      onClick={() => packageId && setPlayStoreWebUrl(`https://play.google.com/apps/testing/${packageId.trim()}`)}
                    >
                      Fill
                    </button>
                  </div>
                  <input
                    type="url"
                    placeholder="https://play.google.com/apps/testing/com.example.app"
                    className="input"
                    value={playStoreWebUrl}
                    onChange={(e) => setPlayStoreWebUrl(e.target.value)}
                  />
                  <span className={styles.helpText}>
                    Link where testers accept the testing program invitation in their web browser.
                  </span>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Live Web App / Web Test Version URL</label>
                <input
                  type="url"
                  placeholder="https://app.example.com or web preview link"
                  className="input"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                />
                <span className={styles.helpText}>
                  Optional URL for users to test or preview the web version directly in browser.
                </span>
              </div>

              <div className="input-group">
                <label className="input-label">Tester Instructions & Onboarding Guide</label>
                <textarea
                  rows={3}
                  placeholder="e.g., 1. Make sure your Google email is added to our tester whitelist. 2. Click Join on Web to accept the invite. 3. Click Join on Android to install."
                  className="textarea"
                  value={testingInstructions}
                  onChange={(e) => setTestingInstructions(e.target.value)}
                />
                <span className={styles.helpText}>
                  Instructions displayed to testers on the app page explaining how to access and test this build.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Releases */}
        {activeTab === 'releases' && (
          <div className={styles.tabContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Release Builds</h3>
                <p className={styles.helpText}>Manage installable binaries (APK, AAB) and release notes for this app.</p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {initialData?.id ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setIsReleaseModalOpen(true)}
                    >
                      <Plus size={14} />
                      <span>Create Release</span>
                    </button>
                    <Link href={`/admin/apps/${initialData.slug}/releases`} className="btn btn-secondary btn-sm">
                      <span>Manage All Releases</span>
                      <ArrowRight size={14} />
                    </Link>
                  </>
                ) : (
                  <span className="badge badge-warning">Save app first to upload release builds</span>
                )}
              </div>
            </div>

            {versions.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <Smartphone size={40} className="empty-state-icon" />
                <div className="empty-state-title">No Releases Yet</div>
                <div className="empty-state-desc">
                  {initialData?.id
                    ? 'Upload your first APK or build bundle to publish this app to users.'
                    : 'Save this app listing first, then you can upload APK binaries directly.'}
                </div>
              </div>
            ) : (
              <div className={styles.releaseSummaryCard}>
                {latestVersion && (
                  <div className={styles.releaseSummaryRow}>
                    <div>
                      <div className={styles.releaseSummaryVersion}>
                        v{latestVersion.versionName}{' '}
                        <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, fontSize: '0.8125rem' }}>
                          (code {latestVersion.versionCode})
                        </span>
                      </div>
                      <div className={styles.helpText}>
                        Latest release · {latestVersion.platform || 'Android'} · {formatDate(latestVersion.createdAt)}
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        latestVersion.status === 'PUBLISHED'
                          ? 'badge-success'
                          : latestVersion.status === 'DRAFT'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {latestVersion.status}
                    </span>
                  </div>
                )}

                {versionsWithNoFile > 0 && (
                  <div className={styles.releaseWarningBanner}>
                    <AlertCircle size={14} />
                    <span>
                      {versionsWithNoFile} release{versionsWithNoFile > 1 ? 's are' : ' is'} missing a build file —
                      downloads for {versionsWithNoFile > 1 ? 'them' : 'it'} currently serve a labeled sample package.
                    </span>
                  </div>
                )}

                <div className={styles.helpText}>
                  {versions.length} total release{versions.length !== 1 ? 's' : ''}.{' '}
                  {initialData?.id && (
                    <Link href={`/admin/apps/${initialData.slug}/releases`}>View full release history →</Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Live Storefront Preview */}
        {activeTab === 'preview' && (
          <div className={styles.tabContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Live Storefront Card & Details Preview</h3>
                <p className={styles.helpText}>
                  See exactly how users will see this app on the public marketplace and detail pages in real time.
                </p>
              </div>
              <span className="badge badge-primary">Interactive Preview</span>
            </div>

            {/* Storefront Catalog Card Preview */}
            <div style={{ marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1. Catalog App Card (Homepage & Search)
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    maxWidth: 380,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <img
                      src={iconPreview || iconUrl || `/api/placeholder/icon/${slug || 'app'}`}
                      alt={name || 'App Icon'}
                      style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', background: 'var(--color-gray-100)', flexShrink: 0 }}
                      onError={(e) => {
                        e.currentTarget.src = `/api/placeholder/icon/${slug || 'app'}`;
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {name || 'Application Title'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{developerType === 'OTHER' ? (developerName || 'Other Developer') : 'Silver Byte Studios'}</span>
                        {developerType === 'SILVER_BYTE' && (
                          <span style={{ fontSize: '0.625rem', color: 'var(--color-primary)', fontWeight: 600 }}>• Official</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.6875rem',
                            backgroundColor: categories.find((c) => c.id === categoryId)?.color ? `${categories.find((c) => c.id === categoryId).color}15` : 'var(--color-gray-100)',
                            color: categories.find((c) => c.id === categoryId)?.color || 'var(--color-text)',
                            border: `1px solid ${categories.find((c) => c.id === categoryId)?.color || '#ccc'}30`,
                          }}
                        >
                          {categories.find((c) => c.id === categoryId)?.name || 'Uncategorized'}
                        </span>
                        {appType === 'MOD' && (
                          <span className="badge" style={{ fontSize: '0.6875rem', background: '#f59e0b', color: '#000000', fontWeight: 800, padding: '1px 6px' }}>
                            ⚡ MOD
                          </span>
                        )}
                        {featured && <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>Featured</span>}
                        {(isTesting || playStoreUrl || playStoreWebUrl) && (
                          <span className="badge badge-danger" style={{ fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <FlaskConical size={10} />
                            <span>{testingTrack ? testingTrack.replace(/_/g, ' ') : 'Testing'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {appType === 'MOD' && modDetails && (
                    <div style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>
                      ⚡ <strong>Mod Info:</strong> {modDetails}
                    </div>
                  )}

                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {shortDescription || 'Short description summary will appear here for visitors exploring the app store.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--color-divider)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      v{latestVersion?.versionName || '1.0'} • Android
                    </span>
                    <button type="button" className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>
                      Get App
                    </button>
                  </div>
                </div>

                {/* Testing Card Preview if configured */}
                {(isTesting || playStoreUrl || playStoreWebUrl || webAppUrl) && (
                  <div style={{ marginTop: 14, padding: 12, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(211,47,47,0.08) 0%, rgba(0,0,0,0.3) 100%)', border: '1px solid rgba(211,47,47,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>
                      <FlaskConical size={14} color="#ff5252" />
                      <span>Testing Links Preview</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {playStoreUrl && (
                        <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 4, background: '#1b5e20', color: 'white', fontWeight: 600 }}>
                          📱 Join on Android
                        </span>
                      )}
                      {playStoreWebUrl && (
                        <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 4, background: '#0d47a1', color: 'white', fontWeight: 600 }}>
                          🌐 Join on Web
                        </span>
                      )}
                      {webAppUrl && (
                        <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 4, background: '#4a148c', color: 'white', fontWeight: 600 }}>
                          🔗 Web App
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Storefront Feature Banner & Media Preview */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  2. Feature Banner & Screenshots Gallery
                </div>

                {featurePreview || featureUrl ? (
                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', marginBottom: 12 }}>
                    <img
                      src={featurePreview || featureUrl}
                      alt="Feature graphic banner"
                      style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                ) : (
                  <div style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'var(--color-gray-100)', color: 'var(--color-text-tertiary)', fontSize: '0.8125rem', textAlign: 'center', marginBottom: 12 }}>
                    No feature graphic uploaded yet (1024x500 banner)
                  </div>
                )}

                {screenshots.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                    {screenshots.map((s, idx) => (
                      <img
                        key={idx}
                        src={s.preview || s.url}
                        alt={`Screenshot ${idx + 1}`}
                        style={{ height: 110, width: 62, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--color-border)', flexShrink: 0 }}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    No screenshots added. Add screenshots in the Graphics tab.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className={styles.stickyFooter}>
          <div className={styles.footerLeft}>
            <Link
              href="/admin/apps"
              className="btn btn-secondary"
              onClick={(e) => {
                if (!confirmDiscardIfDirty()) e.preventDefault();
              }}
            >
              Cancel
            </Link>
          </div>

          <div className={styles.footerRight}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ padding: '2px 5px', background: 'var(--color-gray-100)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '0.6875rem' }}>⌘S</kbd> to save
            </span>

            {status === 'PUBLISHED' ? (
              <span className="badge badge-success">Will be Published</span>
            ) : (
              <span className="badge badge-warning">Will Save as {status === 'ARCHIVED' ? 'Archived' : 'Draft'}</span>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              disabled={isSubmitting || uploadingIcon || uploadingFeature || uploadingScreenshot}
              onClick={(e) => handleSubmit(e, 'DRAFT')}
            >
              Save as Draft
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || uploadingIcon || uploadingFeature || uploadingScreenshot}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{primaryLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Release Form Modal */}
      {initialData?.id && (
        <ReleaseFormModal
          isOpen={isReleaseModalOpen}
          onClose={() => setIsReleaseModalOpen(false)}
          app={initialData}
          onSuccess={handleReleaseSuccess}
        />
      )}
    </div>
  );
}
