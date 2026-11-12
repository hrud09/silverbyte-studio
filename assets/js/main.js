/**
 * Silverbyte Studio - Lightweight Interactive Script
 */

document.addEventListener('DOMContentLoaded', () => {
    initSiteNav();

    // Dynamic current year
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
});

/**
 * Site navigation: section panels (Games / Apps / Support) and the mobile drawer.
 * Desktop panels open on click, or on hover for mouse users; on mobile they act as accordions.
 */
function initSiteNav() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    const toggle = nav.querySelector('.nav-toggle');
    const menu = nav.querySelector('.nav-menu');
    const items = [...nav.querySelectorAll('.nav-item')].filter(item => item.querySelector('.nav-panel'));
    const mobileQuery = window.matchMedia('(max-width: 960px)');
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    let closeTimer = null;

    const setItem = (item, open) => {
        item.classList.toggle('is-open', open);
        item.querySelector('.nav-trigger').setAttribute('aria-expanded', String(open));
    };

    const closeAll = (except) => items.forEach(item => item !== except && setItem(item, false));

    const setMenu = (open) => {
        nav.classList.toggle('is-menu-open', open);
        document.body.classList.toggle('nav-locked', open);
        if (toggle) {
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        }
        if (!open) closeAll();
    };

    items.forEach(item => {
        const trigger = item.querySelector('.nav-trigger');

        trigger.addEventListener('click', () => {
            // A mouse user clicking a panel that hover already opened means "keep it open"
            const hoverOpened = !mobileQuery.matches && hoverQuery.matches && item.matches(':hover');
            const open = hoverOpened || !item.classList.contains('is-open');
            closeAll(item);
            setItem(item, open);
        });

        // Hover intent for mouse users on the desktop bar
        item.addEventListener('mouseenter', () => {
            if (mobileQuery.matches || !hoverQuery.matches) return;
            clearTimeout(closeTimer);
            closeAll(item);
            setItem(item, true);
        });

        item.addEventListener('mouseleave', () => {
            if (mobileQuery.matches || !hoverQuery.matches) return;
            closeTimer = setTimeout(() => setItem(item, false), 180);
        });

        // Close a desktop panel when keyboard focus leaves it
        item.addEventListener('focusout', (e) => {
            if (!mobileQuery.matches && !item.contains(e.relatedTarget)) setItem(item, false);
        });
    });

    if (toggle) {
        toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-menu-open')));
    }

    // Any link inside the nav (including same-page #anchors) closes everything
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => setMenu(false));
    });

    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) {
            if (mobileQuery.matches) setMenu(false);
            else closeAll();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const openItem = items.find(item => item.classList.contains('is-open'));
        if (openItem && !mobileQuery.matches) {
            setItem(openItem, false);
            openItem.querySelector('.nav-trigger').focus();
        } else if (nav.classList.contains('is-menu-open')) {
            setMenu(false);
            toggle && toggle.focus();
        }
    });

    // Leaving the mobile layout (rotate / resize) resets the drawer
    mobileQuery.addEventListener('change', () => setMenu(false));
}

/**
 * Copy email to clipboard with visual feedback
 */
function copyEmail(email, btnEl) {
    if (!navigator.clipboard) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = email;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopyFeedback(btnEl);
        } catch (err) {
            console.error('Failed to copy', err);
        }
        document.body.removeChild(textarea);
        return;
    }

    navigator.clipboard.writeText(email).then(() => {
        showCopyFeedback(btnEl);
    }).catch(err => {
        console.error('Failed to copy', err);
    });
}

function showCopyFeedback(btnEl) {
    if (!btnEl) return;
    const originalText = btnEl.innerHTML;
    btnEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg> Copied!
    `;
    btnEl.style.borderColor = '#10b981';
    btnEl.style.color = '#6ee7b7';

    setTimeout(() => {
        btnEl.innerHTML = originalText;
        btnEl.style.borderColor = '';
        btnEl.style.color = '';
    }, 2200);
}
