'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, Shield, CheckCircle, AlertCircle, Save } from 'lucide-react';
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

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please provide current and new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to change password');

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Password update failed');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Profile & Security</h1>
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

        {/* Change Password Card */}
        <div id="password" className={styles.card}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={20} color="var(--color-primary)" />
              <h2 className={styles.cardTitle}>Change Password</h2>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className={styles.cardBody}>
            <div className="input-group">
              <label className="input-label" htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                id="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="newPassword">New Password</label>
              <input
                type="password"
                className="input"
                placeholder="At least 6 characters"
                id="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                className="input"
                placeholder="Repeat new password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isChangingPassword}
              style={{ alignSelf: 'flex-start', marginTop: 'var(--space-2)' }}
            >
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
