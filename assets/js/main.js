/**
 * Silverbyte Studio - Lightweight Interactive Script
 */

document.addEventListener('DOMContentLoaded', () => {
    initSiteNav();
    initStudioFinder();

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
 * Studio Algorithm Finder & landing page personalization.
 *
 * Flow: finder (3-step card) -> activate -> matched profile + unlock of the
 * gated lower sections -> spotlight on the matched section. The choice is
 * stored in localStorage; returning visitors land on the matched profile.
 */
function initStudioFinder() {
    const sessionView = document.getElementById('hero-interactive-session');
    const matchedView = document.getElementById('hero-matched-profile');
    const lowerContainer = document.getElementById('portal-lower-container');
    const root = document.documentElement;
    if (!sessionView || !matchedView || !lowerContainer) {
        root.classList.remove('sb-gated', 'sb-returning');
        return;
    }

    const STORAGE_KEY = 'silverbyte_studio_preference';
    const SPACE_ORDER = ['b2b', 'b2c', 'games', 'all'];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ms = (n) => (reduceMotion.matches ? 0 : n);

    const $ = (id) => document.getElementById(id);
    const card = $('qa-card');
    const stepBtns = [...card.querySelectorAll('.qa-stepper-btn')];
    const panels = [...card.querySelectorAll('.qa-panel')];
    const businessBtns = [...card.querySelectorAll('[data-name="business"]')];
    const typeBtns = [...card.querySelectorAll('[data-name="type"]')];
    const catChips = [...card.querySelectorAll('.qa-cat-chip')];
    const typeHint = $('qa-type-hint');
    const telemetry = $('qa-telemetry');
    const telTag = $('qa-telemetry-tag');
    const telMsg = $('qa-telemetry-msg');
    const telCount = $('qa-telemetry-count');
    const telSegs = [...telemetry.querySelectorAll('.seg')];
    const activateBtn = $('btn-activate-profile');
    const activateLabel = $('btn-activate-label');
    const skipBtn = $('btn-skip-interactive');
    const retuneBtn = $('btn-retune-qa');
    const seg = matchedView.querySelector('.space-seg');
    const quickPills = [...matchedView.querySelectorAll('.quick-space-pill')];
    const metricsEl = $('matched-metrics');
    const metricEls = [...metricsEl.querySelectorAll('.metric')];
    const gatingText = $('gating-progress-text');
    const gatingPct = $('gating-progress-pct');
    const gatingSegs = [...document.querySelectorAll('#portal-gating-banner .gating-meter .seg')];
    const gatingFocusBtn = $('btn-gating-focus');
    const bypassBtn = $('btn-unlock-gating');
    const sectionsContent = $('portal-sections-content');
    const b2bActiveBadge = $('b2b-active-badge');
    const shippedItems = [...document.querySelectorAll('#hero-shipped-list .shipped-item')];

    const sections = {
        b2b: $('business-space'),
        b2c: $('apps'),
        games: $('games'),
        desktop: $('desktop-apps')
    };

    // Counts come from the shipped list so the metrics stay true as products are added
    const shippedLis = [...document.querySelectorAll('#hero-shipped-list > li')];
    const countWhere = (fn) => shippedLis.filter(fn).length;
    const pad = (n) => String(n).padStart(2, '0');
    const counts = {
        all: shippedLis.length,
        games: countWhere(li => li.dataset.cardCategory === 'games'),
        consumerApps: countWhere(li => (li.dataset.cardAudience || '').includes('b2c') && li.dataset.cardCategory !== 'games')
    };

    const MAIL_B2B = 'mailto:silverbytestudio@gmail.com?subject=[B2B%20Project%20Inquiry]%20Silverbyte%20Studio';

    const SPACES = {
        b2b: {
            badge: 'B2B business space',
            telemetry: 'B2B ENTERPRISE SPACE',
            headline: 'Enterprise & custom software, built for modern businesses.',
            description: 'Silverbyte Studio designs and engineers property platforms like Realigator and custom operational tools on private, high-performance architectures.',
            primary: ['Explore B2B solutions', '#business-space'],
            secondary: ['Consult with the studio', MAIL_B2B],
            section: 'b2b',
            spotlight: li => (li.dataset.cardAudience || '').includes('b2b'),
            metrics: [
                ['Flagship', 'Realigator', 'Property & lease OS'],
                ['Backend', 'Supabase', 'Postgres + row-level security'],
                ['Clients', 'Expo', 'iOS · Android · desktop']
            ]
        },
        b2c: {
            badge: 'B2C applications space',
            telemetry: 'B2C CONSUMER APPS',
            headline: 'Polished native Android utilities and creative tools.',
            description: 'Fast, privacy-first mobile apps for video conversion, editing, personal debt tracking, link archiving and AI prompt engineering.',
            primary: ['Explore mobile apps', '#apps'],
            secondary: ['View on Google Play', 'https://play.google.com/store/apps/details?id=com.SilverByteGames.FaceTilesMatch'],
            section: 'b2c',
            spotlight: li => (li.dataset.cardAudience || '').includes('b2c') && li.dataset.cardCategory !== 'games',
            metrics: [
                ['Consumer apps', pad(counts.consumerApps), 'Shipped & maintained'],
                ['Stack', 'Compose', 'Plus Flutter & Electron'],
                ['Distribution', 'Google Play', 'Plus Windows desktop']
            ]
        },
        games: {
            badge: 'Unity games portfolio',
            telemetry: 'UNITY GAMES SPACE',
            headline: 'Tactile casual and physics-driven arcade games.',
            description: 'Original puzzle and arcade titles built in Unity, with responsive haptics, layered 3D boards and satisfying physics.',
            primary: ['Play Triple Tiles', '#games'],
            secondary: ['See game features', 'triple-tiles.html'],
            section: 'games',
            spotlight: li => li.dataset.cardCategory === 'games',
            metrics: [
                ['Original titles', pad(counts.games), '1 live · 1 in development'],
                ['Engine', 'Unity', 'C#'],
                ['Platform', 'Android', 'Google Play']
            ]
        },
        all: {
            badge: 'Full studio portfolio',
            telemetry: 'FULL CATALOG',
            headline: 'Polished apps and games, built and shipped in-house.',
            description: 'Silverbyte Studio designs, builds and maintains its own Android apps, desktop tools and Unity games, and builds custom software for businesses with the same care.',
            primary: ['Explore all products', '#business-space'],
            secondary: ['Work with us', 'business.html'],
            section: 'b2b',
            spotlight: () => false,
            metrics: [
                ['Products', pad(counts.all), 'Apps, games & platforms'],
                ['Platforms', '03', 'Android · Windows · Web'],
                ['Stacks', 'Unity', 'Compose · Flutter · Expo']
            ]
        }
    };

    const state = {
        business: null,
        type: null,
        categories: new Set(),
        step: 1,
        activeSpace: null,
        isActivated: false,
        retuning: false,
        typeLocked: false,
        busy: false
    };

    let advanceTimer = null;
    let switchTimer = null;

    /* ---------------- persistence ---------------- */
    function loadProfile() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (!saved || !saved.isActivated) return false;
            state.business = businessBtns.some(b => b.dataset.val === saved.business) ? saved.business : null;
            state.type = saved.type === 'b2b' || saved.type === 'b2c' ? saved.type : null;
            state.activeSpace = SPACES[saved.activeSpace] ? saved.activeSpace : 'all';
            state.categories = new Set(Array.isArray(saved.categories) ? saved.categories : []);
            state.isActivated = true;
            return true;
        } catch (e) {
            return false;
        }
    }

    function saveProfile() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                business: state.business,
                type: state.type,
                activeSpace: state.activeSpace,
                categories: [...state.categories],
                isActivated: true
            }));
        } catch (e) { /* private mode: personalization lasts for this visit only */ }
    }

    /* ---------------- helpers ---------------- */
    // Restart a CSS animation class on an element
    function replay(el, cls) {
        if (!el) return;
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
    }

    function onAnimationDone(el, fn, fallback) {
        let done = false;
        const finish = () => { if (!done) { done = true; fn(); } };
        if (!ms(1)) return finish();
        el.addEventListener('animationend', finish, { once: true });
        setTimeout(finish, fallback);
    }

    // ARIA radio group: roving tabindex, arrow keys move + select (no auto-advance)
    function bindRadioGroup(radios, onPick) {
        radios.forEach((radio, i) => {
            radio.addEventListener('click', (e) => onPick(radio, { pointer: e.detail > 0 }));
            radio.addEventListener('keydown', (e) => {
                const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
                let next = null;
                if (step) next = radios[(i + step + radios.length) % radios.length];
                else if (e.key === 'Home') next = radios[0];
                else if (e.key === 'End') next = radios[radios.length - 1];
                if (!next) return;
                e.preventDefault();
                next.focus();
                onPick(next, { pointer: false });
            });
        });
    }

    function syncRadios(radios, value, key) {
        let any = false;
        radios.forEach(r => {
            const on = r.dataset[key] === value;
            any = any || on;
            r.setAttribute('aria-checked', String(on));
            r.tabIndex = on ? 0 : -1;
        });
        if (!any && radios[0]) radios[0].tabIndex = 0;
    }

    const labelFor = (radios, val) => (radios.find(r => r.dataset.val === val) || {}).dataset?.label || '';
    // A suggested model is a hint, not an answer: only a visitor's own pick counts
    const answered = () => (state.business ? 1 : 0) + (state.type && state.typeLocked ? 1 : 0);

    function matchSpace() {
        const type = state.type || (state.business === 'individual' ? 'b2c' : 'b2b');
        if (type === 'b2c' && state.categories.has('unity-games') && !state.categories.has('compose-apps')) return 'games';
        return type;
    }

    /* ---------------- finder ---------------- */
    function setStep(n, { focus = false } = {}) {
        state.step = n;
        card.style.setProperty('--qa-step', n);
        stepBtns.forEach((btn, i) => {
            if (i + 1 === n) btn.setAttribute('aria-current', 'step');
            else btn.removeAttribute('aria-current');
        });
        panels.forEach((panel, i) => {
            panel.classList.toggle('is-active', i + 1 === n);
            panel.classList.toggle('is-before', i + 1 < n);
        });
        if (focus) {
            const panel = panels[n - 1];
            const target = panel.querySelector('[aria-checked="true"]') || panel.querySelector('[tabindex="0"], .qa-cat-chip');
            if (target) setTimeout(() => target.focus({ preventScroll: true }), ms(80));
        }
    }

    function queueAdvance(to) {
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(() => setStep(to), ms(320));
    }

    function selectBusiness(val) {
        state.business = val;
        syncRadios(businessBtns, val, 'val');
        // Suggest a software model from the organization, until the visitor picks one
        if (!state.typeLocked) {
            const suggestion = val === 'individual' ? 'b2c' : 'b2b';
            selectType(suggestion, { suggested: true });
        }
        render();
    }

    function selectType(val, { suggested = false } = {}) {
        state.type = val;
        if (!suggested) state.typeLocked = true;
        syncRadios(typeBtns, val, 'val');
        typeHint.textContent = suggested ? 'Suggested' : 'Pick one';
        typeHint.classList.toggle('is-suggested', suggested);
        catChips.forEach(chip => chip.classList.toggle('is-dimmed', !chip.dataset.target.split(' ').includes(val)));
        render();
    }

    function toggleCategory(chip) {
        const cat = chip.dataset.cat;
        const on = !state.categories.has(cat);
        if (on) state.categories.add(cat); else state.categories.delete(cat);
        chip.setAttribute('aria-pressed', String(on));
        // A category that only fits one model settles the model if none was chosen
        if (on && !state.type) {
            const targets = chip.dataset.target.split(' ');
            if (targets.length === 1) selectType(targets[0], { suggested: true });
        }
        render();
    }

    let lastTelemetry = '';
    function setTelemetry(stateName, tag, msg) {
        const key = stateName + tag + msg;
        if (key === lastTelemetry) return;
        lastTelemetry = key;
        telemetry.dataset.state = stateName;
        if (telTag.textContent !== tag) { telTag.textContent = tag; replay(telTag, 'is-swapping'); }
        telMsg.textContent = msg;
        replay(telMsg, 'is-swapping');
    }

    function render() {
        const n = answered();

        // Stepper summaries + done marks
        card.querySelector('[data-summary="business"]').textContent = labelFor(businessBtns, state.business);
        card.querySelector('[data-summary="type"]').textContent = labelFor(typeBtns, state.type);
        card.querySelector('[data-summary="categories"]').textContent = state.categories.size ? `${state.categories.size} selected` : '';
        stepBtns[0].classList.toggle('is-done', Boolean(state.business));
        stepBtns[1].classList.toggle('is-done', Boolean(state.type && state.typeLocked));
        stepBtns[2].classList.toggle('is-done', state.categories.size > 0);

        // Telemetry
        telSegs.forEach((s, i) => s.classList.toggle('is-on', i < n));
        telCount.textContent = `${n}/2`;
        if (n === 0 && state.categories.size === 0) {
            setTelemetry('standby', '[STANDBY]', 'Awaiting input');
        } else if (!state.type) {
            setTelemetry('calibrating', '[CALIBRATING…]', `org=${state.business || '?'} · model=? · focus=${state.categories.size}`);
        } else if (n < 2) {
            setTelemetry('calibrating', '[CALIBRATING…]', `Leaning ${SPACES[matchSpace()].telemetry}`);
        } else {
            setTelemetry('matched', '[MATCH FOUND]', SPACES[matchSpace()].telemetry);
        }

        // Gating HUD progress mirrors the finder
        if (gatingText) gatingText.textContent = `${n} of 2 inputs answered`;
        if (gatingPct) gatingPct.textContent = `${n * 50}%`;
        gatingSegs.forEach((s, i) => s.classList.toggle('is-on', i < n));

        activateBtn.disabled = !(state.business || state.type);
    }

    bindRadioGroup(businessBtns, (btn, { pointer }) => {
        selectBusiness(btn.dataset.val);
        if (pointer) queueAdvance(2);
    });

    bindRadioGroup(typeBtns, (btn, { pointer }) => {
        selectType(btn.dataset.val);
        if (pointer) queueAdvance(3);
    });

    catChips.forEach(chip => chip.addEventListener('click', () => toggleCategory(chip)));

    card.querySelectorAll('[data-goto]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            clearTimeout(advanceTimer);
            setStep(Number(btn.dataset.goto), { focus: e.detail === 0 || btn.classList.contains('qa-nav-btn') });
        });
    });

    /* ---------------- activation & unlock ---------------- */
    function activate() {
        if (state.busy || activateBtn.disabled) return;
        state.busy = true;
        clearTimeout(advanceTimer);
        if (!state.type) state.type = state.business === 'individual' ? 'b2c' : 'b2b';
        const space = matchSpace();
        setTelemetry('locking', '[LOCKING]', `Routing to ${SPACES[space].telemetry}`);
        setTimeout(() => commit(space, { scroll: true }), ms(420));
    }

    function commit(space, { scroll }) {
        const wasGated = lowerContainer.classList.contains('is-gated');
        state.activeSpace = space;
        state.isActivated = true;
        state.retuning = false;
        saveProfile();
        showMatched(space, true);
        unlockPortal({ animate: true }, () => {
            state.busy = false;
            const target = sections[SPACES[space].section];
            // First unlock: let the matched profile land, then guide the eye down.
            // Re-tuning stays in the hero so the new profile can be read.
            if (!scroll || !wasGated || !target) return;
            setTimeout(() => {
                target.scrollIntoView({ behavior: ms(1) ? 'smooth' : 'auto', block: 'start' });
                setTimeout(() => replay(target, 'is-spotlit'), ms(420));
            }, ms(520));
        });
    }

    function bypass() {
        if (state.busy) return;
        state.busy = true;
        commit('all', { scroll: true });
    }

    function setGated(gated) {
        lowerContainer.classList.toggle('is-gated', gated);
        if (sectionsContent) {
            if (gated) sectionsContent.setAttribute('inert', '');
            else sectionsContent.removeAttribute('inert');
        }
    }

    function unlockPortal({ animate }, done = () => {}) {
        if (!lowerContainer.classList.contains('is-gated')) return done();
        if (!animate || !ms(1)) {
            setGated(false);
            return done();
        }
        lowerContainer.classList.add('is-unlocking');
        setTimeout(() => {
            setGated(false);
            // Let the veil dissolve from the near-opaque frame it reached
            requestAnimationFrame(() => {
                lowerContainer.classList.remove('is-unlocking');
                done();
            });
        }, 380);
    }

    /* ---------------- matched profile ---------------- */
    function showMatched(space, animate) {
        renderSpace(space, false);
        if (!matchedView.hidden) return;
        const enter = () => {
            sessionView.hidden = true;
            sessionView.classList.remove('is-leaving');
            matchedView.hidden = false;
            if (animate) replay(matchedView, 'is-entering');
        };
        if (animate && !sessionView.hidden && ms(1)) {
            sessionView.classList.add('is-leaving');
            onAnimationDone(sessionView, enter, 260);
        } else {
            enter();
        }
    }

    function renderSpace(space, animateSwap) {
        const cfg = SPACES[space] || SPACES.all;
        state.activeSpace = space;
        matchedView.dataset.space = space;

        $('matched-badge-text').textContent = cfg.badge;
        $('matched-headline').textContent = cfg.headline;
        $('matched-description').textContent = cfg.description;
        const primary = $('matched-primary-btn');
        const secondary = $('matched-secondary-btn');
        primary.textContent = cfg.primary[0];
        primary.href = cfg.primary[1];
        secondary.textContent = cfg.secondary[0];
        secondary.href = cfg.secondary[1];
        const external = /^https?:/.test(cfg.secondary[1]);
        if (external) { secondary.target = '_blank'; secondary.rel = 'noopener noreferrer'; }
        else { secondary.removeAttribute('target'); secondary.removeAttribute('rel'); }

        metricEls.forEach((el, i) => {
            const [label, value, note] = cfg.metrics[i];
            el.querySelector('dt').textContent = label;
            el.querySelector('.metric-value').textContent = value;
            el.querySelector('.metric-note').textContent = note;
        });

        // Segmented control
        seg.style.setProperty('--seg-index', SPACE_ORDER.indexOf(space));
        syncRadios(quickPills, space, 'switch');

        // Section + shipped panel highlights
        Object.values(sections).forEach(sec => sec && sec.classList.remove('is-active-space'));
        if (space !== 'all' && sections[cfg.section]) sections[cfg.section].classList.add('is-active-space');
        if (b2bActiveBadge) b2bActiveBadge.hidden = space !== 'b2b';
        shippedItems.forEach(item => item.classList.toggle('is-spotlight', cfg.spotlight(item.closest('li'))));

        if (animateSwap) {
            replay(matchedView, 'is-switching');
            replay(metricsEl, 'is-swapping');
        }
    }

    bindRadioGroup(quickPills, (pill) => {
        const space = pill.dataset.switch;
        if (space === state.activeSpace) return;
        clearTimeout(switchTimer);
        renderSpace(space, true);
        // Persist once the visitor settles (arrow-key sweeps write once)
        switchTimer = setTimeout(saveProfile, 400);
    });

    /* ---------------- re-tune ---------------- */
    function openRetune() {
        if (state.busy) return;
        state.retuning = true;
        activateLabel.textContent = 'Apply new match';
        skipBtn.textContent = 'Cancel, keep my current space';
        const show = () => {
            matchedView.hidden = true;
            matchedView.classList.remove('is-leaving');
            sessionView.hidden = false;
            replay(sessionView, 'is-entering');
            setStep(!state.business ? 1 : !state.type ? 2 : 3);
            render();
            const top = sessionView.getBoundingClientRect().top;
            if (top < 0) sessionView.scrollIntoView({ behavior: ms(1) ? 'smooth' : 'auto', block: 'start' });
            card.querySelector('.qa-stepper-btn[aria-current="step"]').focus({ preventScroll: true });
        };
        if (ms(1)) {
            matchedView.classList.add('is-leaving');
            onAnimationDone(matchedView, show, 260);
        } else {
            show();
        }
    }

    function cancelRetune() {
        // Restore the saved answers and go back to the matched view
        loadProfile();
        applyAnswersToUI();
        state.retuning = false;
        state.busy = false;
        activateLabel.textContent = 'Activate my studio space';
        skipBtn.textContent = 'Skip & browse everything';
        showMatched(state.activeSpace, true);
    }

    function applyAnswersToUI() {
        syncRadios(businessBtns, state.business, 'val');
        state.typeLocked = Boolean(state.type);
        if (state.type) selectType(state.type);
        else syncRadios(typeBtns, null, 'val');
        catChips.forEach(chip => chip.setAttribute('aria-pressed', String(state.categories.has(chip.dataset.cat))));
        render();
    }

    activateBtn.addEventListener('click', activate);
    skipBtn.addEventListener('click', () => (state.retuning ? cancelRetune() : bypass()));
    if (bypassBtn) bypassBtn.addEventListener('click', bypass);
    if (retuneBtn) retuneBtn.addEventListener('click', openRetune);

    if (gatingFocusBtn) {
        gatingFocusBtn.addEventListener('click', () => {
            card.scrollIntoView({ behavior: ms(1) ? 'smooth' : 'auto', block: 'center' });
            const panel = panels[state.step - 1];
            const target = panel.querySelector('[tabindex="0"], .qa-cat-chip');
            if (target) setTimeout(() => target.focus({ preventScroll: true }), ms(450));
        });
    }

    // Links into a locked section (nav, footer, #hash) open the catalog instead of a wall
    function isGatedTarget(hash) {
        if (!hash || hash.length < 2 || !lowerContainer.classList.contains('is-gated')) return null;
        let el = null;
        try { el = document.querySelector(hash); } catch (e) { return null; }
        return el && sectionsContent && sectionsContent.contains(el) ? el : null;
    }

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const target = isGatedTarget(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        unlockPortal({ animate: false });
        target.scrollIntoView({ behavior: ms(1) ? 'smooth' : 'auto', block: 'start' });
        history.pushState(null, '', link.getAttribute('href'));
    });

    /* ---------------- boot ---------------- */
    if (loadProfile()) {
        applyAnswersToUI();
        setGated(false);
        showMatched(state.activeSpace, false);
    } else {
        sessionView.hidden = false;
        matchedView.hidden = true;
        setGated(true);
        render();
        const deepLink = isGatedTarget(location.hash);
        if (deepLink) {
            unlockPortal({ animate: false });
            requestAnimationFrame(() => deepLink.scrollIntoView());
        }
    }
    setStep(state.step);
    root.classList.remove('sb-gated', 'sb-returning');
}
