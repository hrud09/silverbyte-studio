'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Lock, Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import styles from './login.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get('callbackUrl') || '';
  const callbackUrl = /^\/admin(?:\/[a-zA-Z0-9_-]+)*$/.test(requestedPath) ? requestedPath : '/admin';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        password,
      });

      if (result?.error) {
        setError(result.error || 'Invalid credentials');
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred during sign in');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginCard}>
      {/* Brand Header */}
      <div className={styles.brandHeader}>
        <div className={styles.logoIcon}>
          <img
            src="/logo.png"
            alt=""
            className={styles.logoImg}
          />
        </div>
        <h1 className={styles.brandTitle}>Silverbyte Studio Admin</h1>
        <p className={styles.brandSubtitle}>Sign in to manage the studio portfolio and Silver Red Store.</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className="input-group">
          <label className="input-label" htmlFor="password">
            Password
          </label>
          <div className={styles.inputWrapper}>
            <Lock size={16} className={styles.inputIcon} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={styles.loginInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className={styles.formFooter}>
          <label className={styles.rememberCheckbox}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember this session</span>
          </label>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner" style={{ borderTopColor: '#ffffff' }} />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              <span>Sign In to Console</span>
            </>
          )}
        </button>
      </form>

      {/* Back to Public Store */}
      <Link href="/appstore" className={styles.backToStore}>
        <ArrowLeft size={14} />
        <span>Back to Silver Red Store</span>
      </Link>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className={styles.loginContainer}>
      <Suspense fallback={<div className="page-loading"><div className="spinner spinner-lg" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
