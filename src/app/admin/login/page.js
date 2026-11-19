'use client';

import { Suspense, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import styles from './login.module.css';

function subscribeToHash(notify) {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
}

function LoginForm() {
  const token = useSyncExternalStore(subscribeToHash, () => window.location.hash.slice(1), () => '');
  const requestedPath = useSearchParams().get('callbackUrl') || '';
  const callbackUrl = /^\/admin(?:\/[\w-]+)*$/.test(requestedPath) ? requestedPath : '/admin';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (token) {
        const result = await signIn('credentials', { token, callbackUrl, redirect: false });
        if (!result?.ok || result.error) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          throw new Error('This sign-in link is invalid or has expired. Request a new one.');
        }
        window.location.replace(callbackUrl);
        return;
      }
      const response = await fetch('/api/admin/sign-in-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackUrl }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setMessage('Check the owner inbox for the sign-in link. It is valid for 15 minutes.');
    } catch (err) {
      setError(err.message || 'Sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.loginCard}>
      <div className={styles.brandHeader}>
        <img src="/logo.png" alt="" width="48" height="48" />
        <h1 className={styles.brandTitle}>Silverbyte Studio Admin</h1>
        <p className={styles.brandSubtitle}>
          {token ? 'Use your private link to open the dashboard.' : 'Send a private sign-in link to the studio owner.'}
        </p>
      </div>
      {error && <p role="alert" className={styles.errorBanner}>{error}</p>}
      {message && <p role="status">{message}</p>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <button type="submit" disabled={busy} className={styles.submitBtn}>
          {busy ? 'Please wait…' : token ? 'Sign in' : 'Email sign-in link'}
        </button>
      </form>
      <Link href="/appstore" className={styles.backToStore}>Back to Silver Red Store</Link>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className={styles.loginContainer}>
      <Suspense fallback={<div className="spinner" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
