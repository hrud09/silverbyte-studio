'use client';

import React, { useEffect, useState } from 'react';
import { Save, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import styles from './portfolio.module.css';

export default function AdminPortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        addToast(json.error || 'Failed to load portfolio data', 'error');
      }
    } catch {
      addToast('Failed to load portfolio data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        addToast('Portfolio saved to database and live on /', 'success');
      } else {
        addToast(json.error || 'Failed to save portfolio', 'error');
      }
    } catch {
      addToast('Failed to save portfolio', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field, value) => {
    setData((prev) => ({
      ...prev,
      hero: { ...(prev.hero || {}), [field]: value },
    }));
  };

  const updateProduct = (index, updater) => {
    setData((prev) => {
      const products = [...(prev.products || [])];
      products[index] = updater(products[index]);
      return { ...prev, products };
    });
  };

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Portfolio CMS</h1>
            <p className={styles.subtitle}>Loading studio portfolio data from PostgreSQL...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Portfolio CMS</h1>
          <p className={styles.subtitle}>
            Stored in the unified PostgreSQL database — edits go live immediately on the main portfolio site.
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={loadPortfolio} className={styles.previewBtn}>
            <RefreshCw size={15} />
            Reload
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer" className={styles.previewBtn}>
            <ExternalLink size={15} />
            View Live Site
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={styles.saveBtn}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Hero Settings */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Hero Banner</h2>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Eyebrow</label>
            <input
              className={styles.input}
              value={data.hero?.eyebrow || ''}
              onChange={(e) => updateHero('eyebrow', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              value={data.hero?.title || ''}
              onChange={(e) => updateHero('title', e.target.value)}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Lead</label>
          <textarea
            className={styles.textarea}
            value={data.hero?.lead || ''}
            onChange={(e) => updateHero('lead', e.target.value)}
          />
        </div>
      </section>

      {/* Products */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Studio Products ({data.products?.length || 0})</h2>
        <div className={styles.productList}>
          {(data.products || []).map((product, idx) => (
            <div key={product.id} className={styles.productRow}>
              <div className={styles.productHeader}>
                <div className={styles.productTitleGroup}>
                  {product.icon && (
                    <img
                      src={`/${product.icon.replace(/^\//, '')}`}
                      alt={product.name}
                      className={styles.productIcon}
                    />
                  )}
                  <div>
                    <div className={styles.productName}>{product.name}</div>
                    <div className={styles.productMeta}>
                      ID: {product.id} · Category: {product.category} · Page: /{product.page?.replace(/\.html$/, '')}
                    </div>
                  </div>
                </div>
                <div className={styles.toggles}>
                  {['nav', 'showcase', 'shipped', 'grid', 'footer'].map((slot) => (
                    <label key={slot} className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={Boolean(product.show?.[slot])}
                        onChange={(e) =>
                          updateProduct(idx, (p) => ({
                            ...p,
                            show: { ...(p.show || {}), [slot]: e.target.checked },
                          }))
                        }
                      />
                      {slot}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Card Title</label>
                  <input
                    className={styles.input}
                    value={product.cardTitle || ''}
                    onChange={(e) =>
                      updateProduct(idx, (p) => ({ ...p, cardTitle: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Link URL</label>
                  <input
                    className={styles.input}
                    value={product.link?.url || ''}
                    onChange={(e) =>
                      updateProduct(idx, (p) => ({
                        ...p,
                        link: { ...(p.link || { type: 'store' }), url: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Description</label>
                <textarea
                  className={styles.textarea}
                  value={product.description || ''}
                  onChange={(e) =>
                    updateProduct(idx, (p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
