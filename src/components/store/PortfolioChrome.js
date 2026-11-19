'use client';

import { useEffect, useRef } from 'react';

/**
 * Wires the portfolio header's menus (same behaviour as public/assets/js/main.js
 * initSiteNav) onto the shared header markup rendered by the store layout.
 */
function initSiteNav(root) {
  const nav = root.querySelector('.site-nav');
  if (!nav) return () => {};

  const toggle = nav.querySelector('.nav-toggle');
  const menu = nav.querySelector('.nav-menu');
  const items = [...nav.querySelectorAll('.nav-item')].filter((item) => item.querySelector('.nav-panel'));
  const mobileQuery = window.matchMedia('(max-width: 960px)');
  const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  let closeTimer = null;
  const cleanups = [];
  const on = (target, type, fn) => {
    target.addEventListener(type, fn);
    cleanups.push(() => target.removeEventListener(type, fn));
  };

  const setItem = (item, open) => {
    item.classList.toggle('is-open', open);
    item.querySelector('.nav-trigger').setAttribute('aria-expanded', String(open));
  };
  const closeAll = (except) => items.forEach((item) => item !== except && setItem(item, false));
  const setMenu = (open) => {
    nav.classList.toggle('is-menu-open', open);
    document.body.classList.toggle('nav-locked', open);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    if (!open) closeAll();
  };

  items.forEach((item) => {
    const trigger = item.querySelector('.nav-trigger');
    on(trigger, 'click', () => {
      const hoverOpened = !mobileQuery.matches && hoverQuery.matches && item.matches(':hover');
      const open = hoverOpened || !item.classList.contains('is-open');
      closeAll(item);
      setItem(item, open);
    });
    on(item, 'mouseenter', () => {
      if (mobileQuery.matches || !hoverQuery.matches) return;
      clearTimeout(closeTimer);
      closeAll(item);
      setItem(item, true);
    });
    on(item, 'mouseleave', () => {
      if (mobileQuery.matches || !hoverQuery.matches) return;
      closeTimer = setTimeout(() => setItem(item, false), 180);
    });
    on(item, 'focusout', (e) => {
      if (!mobileQuery.matches && !item.contains(e.relatedTarget)) setItem(item, false);
    });
  });

  if (toggle) on(toggle, 'click', () => setMenu(!nav.classList.contains('is-menu-open')));
  if (menu) menu.querySelectorAll('a').forEach((link) => on(link, 'click', () => setMenu(false)));

  on(document, 'click', (e) => {
    if (nav.contains(e.target)) return;
    if (mobileQuery.matches) setMenu(false);
    else closeAll();
  });
  on(document, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openItem = items.find((item) => item.classList.contains('is-open'));
    if (openItem && !mobileQuery.matches) {
      setItem(openItem, false);
      openItem.querySelector('.nav-trigger').focus();
    } else if (nav.classList.contains('is-menu-open')) {
      setMenu(false);
      if (toggle) toggle.focus();
    }
  });
  const onBreakpoint = () => setMenu(false);
  mobileQuery.addEventListener('change', onBreakpoint);
  cleanups.push(() => mobileQuery.removeEventListener('change', onBreakpoint));

  return () => {
    clearTimeout(closeTimer);
    document.body.classList.remove('nav-locked');
    cleanups.forEach((fn) => fn());
  };
}

export function PortfolioHeader({ html }) {
  const ref = useRef(null);
  useEffect(() => (ref.current ? initSiteNav(ref.current) : undefined), [html]);
  if (!html) return null;
  // display: contents keeps <header class="site-header"> sticky against the page, as on the portfolio.
  return <div ref={ref} style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PortfolioFooter({ html }) {
  if (!html) return null;
  return <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}
