'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Smartphone } from 'lucide-react';
import AppForm from '@/components/admin/AppForm';

export default function NewAppPage() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) {
          setCategories(json.data || []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header with Back Link */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <h1 style={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Create New Application
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Set up metadata, upload visuals, and prepare initial releases
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 500, borderRadius: 14 }} />
      ) : (
        <AppForm categories={categories} isEdit={false} />
      )}
    </div>
  );
}
