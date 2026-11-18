'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title, message, duration) => addToast({ title, message, type: 'success', duration }),
    error: (title, message, duration) => addToast({ title, message, type: 'error', duration }),
    warning: (title, message, duration) => addToast({ title, message, type: 'warning', duration }),
    info: (title, message, duration) => addToast({ title, message, type: 'info', duration }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.container}>
        {toasts.map((t) => {
          const Icon =
            t.type === 'success'
              ? CheckCircle2
              : t.type === 'error'
              ? AlertCircle
              : t.type === 'warning'
              ? AlertTriangle
              : Info;

          return (
            <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
              <Icon className={styles.icon} size={20} />
              <div className={styles.content}>
                {t.title && <h4 className={styles.title}>{t.title}</h4>}
                {t.message && <p className={styles.message}>{t.message}</p>}
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss toast"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      success: (t, m) => console.log('Toast success:', t, m),
      error: (t, m) => console.error('Toast error:', t, m),
      warning: (t, m) => console.warn('Toast warning:', t, m),
      info: (t, m) => console.info('Toast info:', t, m),
    };
  }
  return context;
}
