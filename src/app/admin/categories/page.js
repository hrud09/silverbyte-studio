'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/components/admin/ToastContext';
import { slugify } from '@/lib/utils';
import styles from './categories.module.css';

const PRESET_COLORS = [
  '#D32F2F', // Red
  '#C2185B', // Pink
  '#7B1FA2', // Purple
  '#303F9F', // Indigo
  '#1976D2', // Blue
  '#00796B', // Teal
  '#388E3C', // Green
  '#F57C00', // Orange
  '#E64A19', // Deep Orange
  '#455A64', // Blue Grey
];

const PRESET_ICONS = [
  'Grid',
  'Gamepad2',
  'BarChart3',
  'Wrench',
  'Tv',
  'Settings',
  'Heart',
  'GraduationCap',
  'MessageSquare',
  'Music',
  'Camera',
  'Shield',
];

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('Grid');
  const [color, setColor] = useState('#D32F2F');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation modal state
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (json.success) {
        setCategories(json.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setIcon('Grid');
    setColor('#D32F2F');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setIcon(cat.icon || 'Grid');
    setColor(cat.color || '#D32F2F');
    setIsModalOpen(true);
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!editingCategory) {
      setSlug(slugify(val));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category Name is required');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      slug: slug ? slugify(slug) : slugify(name),
      icon: icon.trim() || 'Grid',
      color: color.trim() || '#D32F2F',
    };

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save category');

      toast.success(editingCategory ? `Category "${name}" updated` : `Category "${name}" created!`);
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Error saving category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;

    const reorderedPayload = newCategories.map((c, idx) => ({ id: c.id, order: idx }));
    setCategories(newCategories);

    try {
      await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reorderedPayload),
      });
      toast.success('Category order updated');
    } catch (err) {
      toast.error('Failed to update category order');
      fetchCategories();
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete category');

      toast.success(`Category "${categoryToDelete.name}" deleted`);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Categories Manager</h1>
          <p className={styles.subtitle}>
            Organize apps into categories, customize accents, and configure navigation ordering
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {categories.length > 3 && (
            <input
              type="text"
              placeholder="Filter categories..."
              className="input"
              style={{ width: 200 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Grid of Categories */}
      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <FolderTree size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">No Categories Configured</h3>
          <p className="empty-state-desc">Create categories to organize apps for browsing and filtering.</p>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            Add First Category
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredCategories.map((cat, index) => {
            const appCount = cat._count?.apps || 0;
            return (
              <div key={cat.id} className={styles.categoryCard}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIdentity}>
                    <div className={styles.iconCircle} style={{ backgroundColor: cat.color }}>
                      {cat.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-tertiary)' }}>
                          #{index + 1}
                        </span>
                        <div className={styles.cardName}>{cat.name}</div>
                      </div>
                      <div className={styles.cardSlug}>/categories/{cat.slug}</div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className="btn-icon btn-ghost"
                      disabled={index === 0}
                      onClick={() => handleMoveOrder(index, 'up')}
                      title="Move Up"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-ghost"
                      disabled={index === categories.length - 1}
                      onClick={() => handleMoveOrder(index, 'down')}
                      title="Move Down"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-ghost"
                      onClick={() => openEditModal(cat)}
                      title="Edit Category"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-ghost"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setCategoryToDelete(cat)}
                      title="Delete Category"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles.cardBottom}>
                  <span>Icon: <code>{cat.icon || 'Grid'}</code></span>
                  <a
                    href={`/admin/apps?category=${cat.id}`}
                    style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.8125rem' }}
                    title="View apps in this category"
                  >
                    {appCount} {appCount === 1 ? 'App' : 'Apps'} assigned →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label className="input-label">
                    Category Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Productivity"
                    className="input"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">
                    Category URL Slug <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. productivity"
                    className="input"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Lucide Icon Identifier</label>
                  <select className="select" value={icon} onChange={(e) => setIcon(e.target.value)}>
                    {PRESET_ICONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Accent Theme Color</label>
                  <div className={styles.colorSwatchGrid}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`${styles.swatchBtn} ${color.toLowerCase() === c.toLowerCase() ? styles.selected : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    className="input"
                    style={{ marginTop: 8 }}
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#D32F2F"
                  />
                </div>

                {/* Live Badge Preview */}
                <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Live Storefront Badge Preview
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${color}15`,
                        color: color,
                        border: `1px solid ${color}35`,
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                      }}
                    >
                      {name || 'Category Preview'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                      Icon: {icon}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with App Warning */}
      {categoryToDelete && (
        <div className="modal-backdrop" onClick={() => setCategoryToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} />
                <span>Delete Category</span>
              </h3>
              <button
                type="button"
                className="btn-icon btn-ghost"
                onClick={() => setCategoryToDelete(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                Are you sure you want to delete category <strong>"{categoryToDelete.name}"</strong>?
              </p>

              {(categoryToDelete._count?.apps || 0) > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: 'var(--color-warning-bg)',
                    color: 'var(--color-warning)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Warning:</strong> This category has{' '}
                    <strong>{categoryToDelete._count.apps} apps</strong> assigned to it.
                    Deleting this category will leave those apps as unassigned.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCategoryToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
