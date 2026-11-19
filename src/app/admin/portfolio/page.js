'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Save, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/admin/ToastContext';
import styles from './portfolio.module.css';

export default function AdminPortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadPortfolio = useCallback(async () => {
    return fetch('/api/portfolio')
      .then(async (res) => {
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load portfolio data');
        setData(json.data);
      })
      .catch((err) => toast.error(err.message || 'Failed to load portfolio data'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

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
        toast.success('Portfolio saved to database and live on /');
      } else {
        toast.error(json.error || 'Failed to save portfolio');
      }
    } catch {
      toast.error('Failed to save portfolio');
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
            <p className={styles.subtitle}>{loading ? 'Loading portfolio…' : 'Portfolio could not be loaded.'}</p>
            {!loading && <button type="button" onClick={loadPortfolio}>Retry</button>}
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
          <button type="button" onClick={() => { setLoading(true); loadPortfolio(); }} className={styles.previewBtn}>
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

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Homepage</h2>
        <label className={styles.field}>
          <span className={styles.label}>Default space</span>
          <select className={styles.select} value={data.settings?.defaultSpace || 'customers'}
            onChange={(e) => setData({ ...data, settings: { ...data.settings, defaultSpace: e.target.value } })}>
            <option value="customers">For Customers</option>
            <option value="business">For Business</option>
          </select>
        </label>
      </section>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Hero Banner</h2>
        <label className={styles.toggleLabel}>
          <input type="checkbox" checked={data.hero?.show !== false}
            onChange={(e) => updateHero('show', e.target.checked)} />
          Show hero banner
        </label>
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

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Homepage sections</h2>
        {Object.entries(data.sections || {}).map(([section, fields]) => (
          <details key={section}>
            <summary>{section.charAt(0).toUpperCase() + section.slice(1)}</summary>
            <div className={styles.grid2}>
              {Object.keys(fields).filter((key) => typeof fields[key] === 'string').map((key) => (
                <label key={key} className={styles.field}>
                  <span className={styles.label}>{key}</span>
                  <input className={styles.input} value={fields[key]} onChange={(e) => setData({
                    ...data, sections: { ...data.sections, [section]: { ...fields, [key]: e.target.value } },
                  })} />
                </label>
              ))}
            </div>
          </details>
        ))}
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
