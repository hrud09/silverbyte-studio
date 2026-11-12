/**
 * Silverbyte Studio - Lightweight Interactive Script
 */

document.addEventListener('DOMContentLoaded', () => {
    initSiteNav();
    initShowcase();

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

/**
 * Project showcase carousel in the hero.
 * Slides hold an <img> or a <video class="showcase-media">. Images stay up for
 * IMAGE_MS; a video plays while its slide is shown and advances when it ends.
 * Autoplay pauses on hover, on focus inside, when the tab is hidden, and when
 * the visitor prefers reduced motion. Swipe, arrow keys and dots navigate.
 */
function initShowcase() {
    const root = document.getElementById('showcase');
    if (!root) return;

    const IMAGE_MS = 5000;
    const track = root.querySelector('.showcase-track');
    const slides = [...track.children];
    const dotsWrap = root.querySelector('.showcase-dots');
    const countCur = root.querySelector('.showcase-count-cur');
    const toggle = root.querySelector('.showcase-toggle');
    const bar = root.querySelector('.showcase-progress-bar');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!slides.length) return;

    let index = 0;
    let userPaused = reduceMotion.matches;
    let hoverPaused = false;
    let timer = null;
    let startedAt = 0;
    let remaining = IMAGE_MS;

    const dots = slides.map((slide, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'showcase-dot';
        const title = slide.querySelector('.showcase-title');
        dot.setAttribute('aria-label', `Show ${title ? title.firstChild.textContent.trim() : 'slide ' + (i + 1)}`);
        dot.addEventListener('click', () => go(i));
        dotsWrap.appendChild(dot);
        return dot;
    });

    const videoOf = (slide) => slide.querySelector('video.showcase-media');
    const isPaused = () => userPaused || hoverPaused || document.hidden;

    slides.forEach((slide) => {
        const video = videoOf(slide);
        if (!video) return;
        video.muted = true;
        video.playsInline = true;
        video.loop = false;
        video.addEventListener('ended', () => { if (slides[index] === slide) next(); });
        video.addEventListener('timeupdate', () => {
            if (slides[index] === slide && video.duration) setBar(video.currentTime / video.duration, false);
        });
    });

    function setBar(fraction, animateMs) {
        if (!bar) return;
        bar.style.transition = animateMs ? `transform ${animateMs}ms linear` : 'none';
        bar.style.transform = `scaleX(${fraction})`;
    }

    function clearTimer() {
        clearTimeout(timer);
        timer = null;
    }

    // Start or resume the clock for the current slide
    function run() {
        clearTimer();
        const video = videoOf(slides[index]);
        if (isPaused()) {
            if (video) video.pause();
            return;
        }
        if (video) {
            const p = video.play();
            if (p && p.catch) p.catch(() => {});
            return;
        }
        startedAt = performance.now();
        setBar(1, remaining);
        timer = setTimeout(next, remaining);
    }

    function pauseClock() {
        if (timer) {
            remaining = Math.max(0, remaining - (performance.now() - startedAt));
            const done = 1 - remaining / IMAGE_MS;
            clearTimer();
            setBar(done, false);
        }
        const video = videoOf(slides[index]);
        if (video) video.pause();
    }

    function go(i) {
        const prev = slides[index];
        const prevVideo = videoOf(prev);
        if (prevVideo) prevVideo.pause();

        index = (i + slides.length) % slides.length;
        track.style.transform = `translateX(${-index * 100}%)`;

        slides.forEach((slide, n) => {
            const active = n === index;
            slide.classList.toggle('is-active', active);
            slide.setAttribute('aria-hidden', String(!active));
            slide.querySelectorAll('a, button, video').forEach(el => { el.tabIndex = active ? 0 : -1; });
            if (active) slide.removeAttribute('inert'); else slide.setAttribute('inert', '');
        });
        dots.forEach((dot, n) => dot.setAttribute('aria-current', String(n === index)));
        if (countCur) countCur.textContent = String(index + 1).padStart(2, '0');

        const video = videoOf(slides[index]);
        if (video) { try { video.currentTime = 0; } catch (e) { /* not loaded yet */ } }
        remaining = IMAGE_MS;
        setBar(0, false);
        // Reflow so the bar restarts from zero before animating
        void bar?.offsetWidth;
        run();
    }

    const next = () => go(index + 1);
    const prev = () => go(index - 1);

    root.querySelectorAll('.showcase-btn[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => (btn.dataset.dir === '1' ? next() : prev()));
    });

    function syncToggle() {
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
        root.classList.toggle('is-paused', userPaused);
    }
    toggle.addEventListener('click', () => {
        userPaused = !userPaused;
        syncToggle();
        if (isPaused()) pauseClock(); else run();
    });

    // Hover / focus pause (pointer devices only, so taps don't freeze it)
    const viewport = root.querySelector('.showcase-viewport');
    const hoverable = window.matchMedia('(hover: hover)');
    viewport.addEventListener('mouseenter', () => { if (!hoverable.matches) return; hoverPaused = true; pauseClock(); });
    viewport.addEventListener('mouseleave', () => { if (!hoverable.matches) return; hoverPaused = false; run(); });
    root.addEventListener('focusin', () => { hoverPaused = true; pauseClock(); });
    root.addEventListener('focusout', (e) => {
        if (root.contains(e.relatedTarget)) return;
        hoverPaused = false;
        run();
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? pauseClock() : run()));

    root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });

    // Swipe
    let startX = null;
    let startY = null;
    let swiped = false;
    viewport.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        startX = e.clientX;
        startY = e.clientY;
        swiped = false;
    });
    viewport.addEventListener('pointerup', (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        startX = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            swiped = true;
            dx < 0 ? next() : prev();
        }
    });
    viewport.addEventListener('pointercancel', () => { startX = null; });
    // A swipe should not also follow the slide link
    viewport.addEventListener('click', (e) => {
        if (swiped) { e.preventDefault(); swiped = false; }
    }, true);

    syncToggle();
    go(0);
}
