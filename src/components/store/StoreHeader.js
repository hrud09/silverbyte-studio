'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronRight, ExternalLink } from 'lucide-react';
import { getAppIconUrl } from '@/lib/utils';
import Skeleton from '@/components/ui/Skeleton';
import styles from './StoreHeader.module.css';

export default function StoreHeader() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/apps?search=${encodeURIComponent(query.trim())}&limit=5`);
        const json = await res.json();
        if (json.success && json.data?.apps) {
          setSuggestions(json.data.apps);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Failed to fetch search suggestions', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div className={styles.header}>
      <div className={styles.container}>
        {/* Brand Logo & Studio Link */}
        <div className={styles.brandGroup}>
          <Link href="/appstore" className={styles.brandLogoLink} aria-label="Silver Red Store">
            <img src="/logo.png" alt="" className={styles.logoImg} width="34" height="34" />
          </Link>
          <div className={styles.brandMeta}>
            <div className={styles.brandTitleRow}>
              <Link href="/appstore" className={styles.brandTitleLink}>
                <span className={styles.brandTitle}>Silver Red Store</span>
              </Link>
              <a
                href="https://silverbytestudio.com"
                className={styles.studioBtn}
                title="Visit silverbytestudio.com"
              >
                <span>Studio</span>
                <ExternalLink size={10} className={styles.studioIcon} />
              </a>
            </div>
            <Link href="/appstore" className={styles.brandSubtitleLink}>
              <span className={styles.brandSubtitle}>Apps &amp; games, direct from the studio</span>
            </Link>
          </div>
        </div>

        {/* Global Search with Real-time Suggestions */}
        <div className={styles.searchWrapper} ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search apps, games, tools..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!showDropdown && e.target.value.trim().length >= 2) {
                  setShowDropdown(true);
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              className={styles.searchInput}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className={styles.clearBtn}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>

          {/* Suggestions Dropdown */}
          {showDropdown && query.trim().length >= 2 && (
            <div className={styles.suggestionsMenu}>
              {isLoading ? (
                <div className={styles.dropdownLoadingList}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={styles.suggestionSkeletonRow}>
                      <Skeleton variant="circular" width={36} height={36} />
                      <div style={{ flex: 1 }}>
                        <Skeleton variant="text" width="70%" height={13} />
                        <Skeleton variant="text" width="45%" height={11} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <div className={styles.suggestionsHeader}>APPS & GAMES</div>
                  {suggestions.map((app) => {
                    const iconUrl = getAppIconUrl(app);
                    return (
                      <Link
                        key={app.id}
                        href={`/apps/${app.slug}`}
                        className={styles.suggestionItem}
                        onClick={() => setShowDropdown(false)}
                      >
                        <img
                          src={iconUrl}
                          alt={app.name}
                          className={styles.suggestionIcon}
                          onError={(e) => {
                            e.currentTarget.src = `/api/placeholder/icon/${app.slug}`;
                          }}
                        />
                        <div className={styles.suggestionMeta}>
                          <div className={styles.suggestionTitle}>{app.name}</div>
                          <div className={styles.suggestionCategory}>
                            {app.category?.name || 'Utility'} • v{app.latestVersion?.versionName || '1.0'}
                          </div>
                        </div>
                        <ChevronRight size={16} className={styles.suggestionArrow} />
                      </Link>
                    );
                  })}
                  <div className={styles.viewAllRow}>
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className={styles.viewAllBtn}
                    >
                      View all results for &quot;{query}&quot;
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.noResults}>
                  <p>No apps found for &quot;{query}&quot;</p>
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className={styles.searchAllBtn}
                  >
                    Search anyway
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
