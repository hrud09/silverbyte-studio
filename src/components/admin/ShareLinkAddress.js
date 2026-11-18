'use client';

import React, { useState } from 'react';
import { Globe, AlertTriangle, Wifi, Check, Pencil, X } from 'lucide-react';
import { useToast } from './ToastContext';
import { normalizeBaseUrl, classifyBaseUrl, PUBLIC_BASE_URL_SETTING } from '@/lib/publicUrl';
import styles from './ShareLinkAddress.module.css';

/**
 * The address every share link is built from, stated plainly and fixable in place.
 *
 * A share link that reads `http://localhost:3000/s/...` is not a small cosmetic
 * problem — it is the whole feature failing silently, because the operator only finds
 * out when the person they sent it to says nothing happened. So the console says which
 * address it is using before anything is sent, and puts the correction next to the
 * warning rather than in a settings page three clicks away.
 */

const SCOPE_COPY = {
  local: {
    Icon: AlertTriangle,
    tone: 'danger',
    heading: 'Share links only work on this computer',
    body:
      'Links are being built from this address, which no other device can open — not on your Wi-Fi, and not over mobile data. Enter the public address this store is reachable at and every link, QR code and email will use it instead.',
  },
  lan: {
    Icon: Wifi,
    tone: 'warning',
    heading: 'Share links only work on this Wi-Fi',
    body:
      'Links are being built from a private network address. A phone on the same Wi-Fi can open them; anything on mobile data or another network cannot. Enter the public address this store is reachable at to fix that.',
  },
  public: {
    Icon: Globe,
    tone: 'ok',
    heading: 'Share links point at',
    body: '',
  },
};

/**
 * @param {Object} props
 * @param {{ baseUrl: string, scope: 'public'|'lan'|'local', source: string, configured: string|null }} props.link
 * @param {(link: Object) => void} props.onSaved - called after the address is stored
 */
export default function ShareLinkAddress({ link, onSaved = () => {} }) {
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(link?.configured || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!link) return null;

  const { Icon, tone, heading, body } = SCOPE_COPY[link.scope] || SCOPE_COPY.local;
  const isPublic = link.scope === 'public';

  // Judge what the operator typed with the same rules the server will apply, so the
  // preview cannot promise a reach the saved value will not have.
  const normalized = normalizeBaseUrl(value);
  const typedScope = value.trim() ? classifyBaseUrl(value) : null;

  const save = async (nextValue) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [PUBLIC_BASE_URL_SETTING]: nextValue }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save the address');

      setIsEditing(false);
      toast.success(nextValue ? 'Share links will now use that address' : 'Address cleared');
      onSaved(json.data);
    } catch (err) {
      toast.error(err.message || 'Could not save the address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!normalized) {
      toast.error('That does not look like a web address');
      return;
    }
    save(normalized);
  };

  const showForm = isEditing || !isPublic;

  return (
    <section className={`${styles.card} ${styles[tone]}`}>
      <div className={styles.row}>
        <span className={styles.icon}>
          <Icon size={16} />
        </span>

        <div className={styles.text}>
          <p className={styles.heading}>
            {heading}
            {isPublic && <code className={styles.inlineUrl}>{link.baseUrl}</code>}
          </p>
          {!isPublic && (
            <>
              <code className={styles.blockUrl}>{link.baseUrl}</code>
              <p className={styles.body}>{body}</p>
            </>
          )}
        </div>

        {isPublic && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setValue(link.configured || link.baseUrl);
              setIsEditing((open) => !open);
            }}
          >
            {isEditing ? <X size={14} /> : <Pencil size={14} />}
            <span>{isEditing ? 'Cancel' : 'Change'}</span>
          </button>
        )}
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            className="input"
            placeholder="https://silverredstore.onrender.com"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isSaving}
            aria-label="Public address of this store"
          />
          <button type="submit" className="btn btn-primary" disabled={isSaving || !value.trim()}>
            {isSaving ? <span className="spinner" /> : <Check size={15} />}
            <span>Save</span>
          </button>
          {link.configured && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setValue('');
                save('');
              }}
              disabled={isSaving}
              title="Go back to detecting the address from each request"
            >
              Clear
            </button>
          )}
        </form>
      )}

      {showForm && (
        <p className={styles.hint}>
          {normalized && typedScope !== 'public' ? (
            <span className={styles.hintWarn}>
              {normalized} is {typedScope === 'lan' ? 'a private network address' : 'a local address'} —
              saving it will not make links openable from another network.
            </span>
          ) : normalized ? (
            <span>
              Links will read <code>{normalized}/s/…</code>
            </span>
          ) : (
            <span>
              Wherever this store is deployed — its Render, Vercel or custom-domain address.
              Not running anywhere public yet? Point a tunnel at this machine
              (<code>cloudflared tunnel --url http://localhost:3000</code>) and paste the address
              it prints; links built while that tunnel is up will work from anywhere.
            </span>
          )}
        </p>
      )}
    </section>
  );
}
