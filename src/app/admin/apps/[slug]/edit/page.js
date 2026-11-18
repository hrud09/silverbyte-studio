'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Layers, AlertCircle } from 'lucide-react';
import AppForm from '@/components/admin/AppForm';

function EditAppContent({ params }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';

  const [app, setApp] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [appRes, catRes] = await Promise.all([
          fetch(`/api/apps/${slug}`),
          fetch('/api/categories'),
        ]);

        const appJson = await appRes.json();
        const catJson = await catRes.json();

        if (!appRes.ok || !appJson.success) {
          throw new Error(appJson.error || 'Failed to load app');
        }

        setApp(appJson.data);
        if (catJson.success) {
          setCategories(catJson.data || []);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'App not found');
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      loadData();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="skeleton" style={{ width: 240, height: 28 }} />
        <div className="skeleton" style={{ height: 500, borderRadius: 14 }} />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="empty-state">
        <AlertCircle size={48} className="empty-state-icon" style={{ color: 'var(--color-danger)' }} />
        <h3 className="empty-state-title">Application Not Found</h3>
        <p className="empty-state-desc">{error || `No application exists with slug "${slug}"`}</p>
        <Link href="/admin/apps" className="btn btn-primary">
          Back to Apps List
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Link
            href="/admin/apps"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to All Apps</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Edit {app.name}
            </h1>
            <span
              className={`badge ${
                app.status === 'PUBLISHED'
                  ? 'badge-success'
                  : app.status === 'DRAFT'
                  ? 'badge-warning'
                  : 'badge-danger'
              }`}
            >
              {app.status}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={`/apps/${app.slug}`} target="_blank" className="btn btn-secondary btn-sm">
            <ExternalLink size={14} />
            <span>View Public Store</span>
          </Link>
        </div>
      </div>

      {/* App Form */}
      <AppForm initialData={app} categories={categories} isEdit={true} initialTab={initialTab} />
    </div>
  );
}

export default function EditAppPage(props) {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 500, borderRadius: 14 }} />}>
      <EditAppContent {...props} />
    </Suspense>
  );
}
