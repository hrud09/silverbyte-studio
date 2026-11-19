'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useToast } from '@/components/admin/ToastContext';
import { useSession } from 'next-auth/react';
import styles from './profile.module.css';

export default function AdminProfilePage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/user/profile');
        const json = await res.json();
        if (json.success) {
          setName(json.data.name || '');
          setEmail(json.data.email || '');
          setRole(json.data.role || 'ADMIN');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Display Name cannot be empty');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update profile');

      await update({ name: name.trim() });
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Error updating profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Profile</h1>
        <p className={styles.subtitle}>
          This account manages the studio portfolio and Silver Red Store.
        </p>
      </div>

      <div className={styles.grid}>
        {/* Profile Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={20} color="var(--color-primary)" />
              <h2 className={styles.cardTitle}>Account Details</h2>
            </div>
            <span className="badge badge-primary">{role}</span>
          </div>

          <form onSubmit={handleUpdateProfile} className={styles.cardBody}>
            <div className={styles.avatarSection}>
              <div className={styles.largeAvatar}>
                {name ? name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{name || 'Administrator'}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{email}</div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Display Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Email Address (Read Only)</label>
              <input
                type="email"
                className="input"
                value={email}
                disabled
                style={{ backgroundColor: 'var(--color-gray-100)', cursor: 'not-allowed' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUpdatingProfile}
              style={{ alignSelf: 'flex-start', marginTop: 'var(--space-2)' }}
            >
              {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
