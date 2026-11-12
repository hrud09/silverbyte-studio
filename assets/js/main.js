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
 * Interactive Studio Algorithm Finder & Landing Page Personalization
 */
function initStudioFinder() {
    const sessionView = document.getElementById('hero-interactive-session');
    const matchedView = document.getElementById('hero-matched-profile');
    const lowerContainer = document.getElementById('portal-lower-container');
    if (!sessionView || !matchedView || !lowerContainer) return;

    const STORAGE_KEY = 'silverbyte_studio_preference';

    // State
    const state = {
        business: null,
        type: null,
        categories: new Set(),
        activeSpace: 'b2b',
        isActivated: false
    };

    // DOM Elements
    const businessBtns = sessionView.querySelectorAll('.qa-pill[data-name="business"]');
    const typeBtns = sessionView.querySelectorAll('.qa-type-btn[data-name="type"]');
    const catChips = sessionView.querySelectorAll('.qa-cat-chip');
    const algoStatusEl = document.getElementById('qa-algo-status-text');
    const algoMatchBox = document.getElementById('qa-algo-match');
    const activateBtn = document.getElementById('btn-activate-profile');
    const skipBtn = document.getElementById('btn-skip-interactive');
    const unlockBannerBtn = document.getElementById('btn-unlock-gating');
    const retuneBtn = document.getElementById('btn-retune-qa');
    const quickPills = matchedView.querySelectorAll('.quick-space-pill');

    // Matched View Elements
    const matchedBadgeText = document.getElementById('matched-badge-text');
    const matchedHeadline = document.getElementById('matched-headline');
    const matchedDescription = document.getElementById('matched-description');
    const matchedPrimaryBtn = document.getElementById('matched-primary-btn');
    const matchedSecondaryBtn = document.getElementById('matched-secondary-btn');
    const factPlatformFocus = document.getElementById('fact-platform-focus');
    const factTechStack = document.getElementById('fact-tech-stack');

    // Sections & Shipped Items
    const b2bSection = document.getElementById('business-space');
    const gamesSection = document.getElementById('games');
    const appsSection = document.getElementById('apps');
    const desktopSection = document.getElementById('desktop-apps');
    const b2bActiveBadge = document.getElementById('b2b-active-badge');
    const shippedItems = document.querySelectorAll('#hero-shipped-list .shipped-item');

    // Check Local Storage on load
    try {
        const savedRaw = localStorage.getItem(STORAGE_KEY);
        if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (saved && saved.isActivated) {
                state.business = saved.business;
                state.type = saved.type;
                state.activeSpace = saved.activeSpace || saved.type || 'b2b';
                state.isActivated = true;
                if (Array.isArray(saved.categories)) {
                    state.categories = new Set(saved.categories);
                }
                applySelectionsToUI();
                renderMatchedView(state.activeSpace, false);
                return;
            }
        }
    } catch (e) {
        console.warn('Storage read failed', e);
    }

    // Default first-time view: gated, interactive session visible
    lowerContainer.classList.add('is-gated');
    sessionView.removeAttribute('hidden');
    matchedView.setAttribute('hidden', '');

    // 1. Business Type Selection
    businessBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.val;
            state.business = val;

            businessBtns.forEach(b => {
                const isSelected = b === btn;
                b.classList.toggle('is-selected', isSelected);
                b.setAttribute('aria-checked', String(isSelected));
            });

            // Smart auto-suggestion for software type if not chosen yet
            if (!state.type) {
                if (val === 'enterprise' || val === 'smallbiz') {
                    selectType('b2b', false);
                } else if (val === 'individual') {
                    selectType('b2c', false);
                }
            }

            updateAlgorithmStatus();
        });
    });

    // 2. Software Type Selection (B2B vs B2C)
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.val;
            selectType(val, true);
        });
    });

    function selectType(val, userClicked) {
        state.type = val;
        state.activeSpace = val;

        typeBtns.forEach(b => {
            const isSelected = b.dataset.val === val;
            b.classList.toggle('is-selected', isSelected);
            b.setAttribute('aria-checked', String(isSelected));
        });

        // Highlight matching categories
        catChips.forEach(chip => {
            const targets = chip.dataset.target.split(' ');
            if (targets.includes(val)) {
                chip.style.opacity = '1';
                chip.style.transform = 'scale(1)';
            } else {
                chip.style.opacity = '0.55';
            }
        });

        updateAlgorithmStatus();
    }

    // 3. Category Chips
    catChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const cat = chip.dataset.cat;
            const target = chip.dataset.target;

            if (state.categories.has(cat)) {
                state.categories.delete(cat);
                chip.classList.remove('is-selected');
            } else {
                state.categories.add(cat);
                chip.classList.add('is-selected');

                // If no type is selected, auto-align with the category's primary target
                if (!state.type) {
                    if (target.includes('b2b') && !target.includes('b2c')) {
                        selectType('b2b', false);
                    } else if (target.includes('b2c') && !target.includes('b2b')) {
                        selectType('b2c', false);
                    }
                }
            }

            updateAlgorithmStatus();
        });
    });

    // Algorithm status calculator
    function updateAlgorithmStatus() {
        const hasBusiness = Boolean(state.business);
        const hasType = Boolean(state.type);
        const hasCat = state.categories.size > 0;

        if (hasType) {
            activateBtn.removeAttribute('disabled');
            algoMatchBox.classList.add('is-matched');

            if (state.type === 'b2b') {
                algoStatusEl.textContent = '✨ Algorithm Matched: Enterprise B2B Business Space (Realigator & Custom Platforms)';
            } else if (state.categories.has('unity-games')) {
                algoStatusEl.textContent = '✨ Algorithm Matched: Unity Games & Interactive Entertainment Space';
            } else {
                algoStatusEl.textContent = '✨ Algorithm Matched: B2C Consumer Applications & Media Tools Space';
            }
        } else if (hasBusiness) {
            algoStatusEl.textContent = 'Business profile registered · Select B2B or B2C software type to finalize match';
            activateBtn.removeAttribute('disabled');
        } else if (hasCat) {
            algoStatusEl.textContent = 'Category selected · Select business or software type to complete match';
            activateBtn.removeAttribute('disabled');
        } else {
            algoMatchBox.classList.remove('is-matched');
            algoStatusEl.textContent = 'Select your business & software type to activate your tailored portal';
            activateBtn.setAttribute('disabled', '');
        }
    }

    // 4. Activate Profile Action
    activateBtn.addEventListener('click', () => {
        if (!state.type) {
            state.type = (state.business === 'enterprise' || state.business === 'smallbiz') ? 'b2b' : 'b2c';
        }
        state.activeSpace = state.type;
        state.isActivated = true;
        saveProfile();
        renderMatchedView(state.activeSpace, true);
    });

    // 5. Skip / Unlock directly
    const unlockAll = () => {
        state.type = 'all';
        state.activeSpace = 'all';
        state.isActivated = true;
        saveProfile();
        renderMatchedView('all', true);
    };

    if (skipBtn) skipBtn.addEventListener('click', unlockAll);
    if (unlockBannerBtn) unlockBannerBtn.addEventListener('click', unlockAll);

    // 6. Re-tune answers
    if (retuneBtn) {
        retuneBtn.addEventListener('click', () => {
            matchedView.setAttribute('hidden', '');
            sessionView.removeAttribute('hidden');
            sessionView.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // 7. Quick space switchers
    quickPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const targetSpace = pill.dataset.switch;
            state.activeSpace = targetSpace;
            saveProfile();
            renderMatchedView(targetSpace, true);
        });
    });

    function saveProfile() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                business: state.business,
                type: state.type,
                activeSpace: state.activeSpace,
                categories: Array.from(state.categories),
                isActivated: true
            }));
        } catch (e) {
            console.warn('Storage write failed', e);
        }
    }

    function applySelectionsToUI() {
        if (state.business) {
            businessBtns.forEach(b => {
                const match = b.dataset.val === state.business;
                b.classList.toggle('is-selected', match);
                b.setAttribute('aria-checked', String(match));
            });
        }
        if (state.type) {
            typeBtns.forEach(b => {
                const match = b.dataset.val === state.type;
                b.classList.toggle('is-selected', match);
                b.setAttribute('aria-checked', String(match));
            });
        }
        catChips.forEach(chip => {
            const has = state.categories.has(chip.dataset.cat);
            chip.classList.toggle('is-selected', has);
        });
        updateAlgorithmStatus();
    }

    // Render Tailored Profile & Activate Matching Space
    function renderMatchedView(space, shouldScroll) {
        // Unlock lower container
        lowerContainer.classList.remove('is-gated');

        // Toggle Views on left side
        sessionView.setAttribute('hidden', '');
        matchedView.removeAttribute('hidden');

        // Update Quick Switcher active pill
        quickPills.forEach(p => p.classList.toggle('is-active', p.dataset.switch === space));

        // Clear section active states
        [b2bSection, gamesSection, appsSection, desktopSection].forEach(sec => {
            if (sec) sec.classList.remove('is-active-space');
        });
        if (b2bActiveBadge) b2bActiveBadge.setAttribute('hidden', '');

        // Clear shipped spotlights
        shippedItems.forEach(item => item.classList.remove('is-spotlight'));

        let targetAnchor = null;

        if (space === 'b2b') {
            // Business B2B Space Active
            matchedBadgeText.textContent = 'B2B Business Space Active';
            matchedHeadline.textContent = 'Enterprise & custom software, built for modern businesses.';
            matchedDescription.textContent = 'Silverbyte Studio designs and engineers enterprise SaaS, tenant and property management platforms like Realigator, and custom operational tools with private, high-performance architectures.';
            
            matchedPrimaryBtn.textContent = 'Explore B2B Solutions';
            matchedPrimaryBtn.setAttribute('href', '#business-space');
            matchedSecondaryBtn.textContent = 'Consult With Studio';
            matchedSecondaryBtn.setAttribute('href', 'mailto:silverbytestudio@gmail.com?subject=[B2B%20Project%20Inquiry]%20Silverbyte%20Studio');

            factPlatformFocus.textContent = 'Cross-Platform & Web';
            factTechStack.textContent = 'Supabase, Compose, Expo';

            if (b2bSection) {
                b2bSection.classList.add('is-active-space');
                targetAnchor = b2bSection;
            }
            if (b2bActiveBadge) b2bActiveBadge.removeAttribute('hidden');

            // Spotlight Realigator & Desktop in shipped panel
            const realigatorItem = document.getElementById('shipped-realigator');
            if (realigatorItem) realigatorItem.classList.add('is-spotlight');

        } else if (space === 'b2c') {
            // Consumer B2C Apps Space Active
            matchedBadgeText.textContent = 'B2C Applications Space Active';
            matchedHeadline.textContent = 'Polished native Android utilities and creative tools.';
            matchedDescription.textContent = 'Fast, privacy-first mobile apps for video conversion, editing, personal debt tracking, link archiving, and AI prompt engineering — 100% on-device and ad-free.';
            
            matchedPrimaryBtn.textContent = 'Explore Mobile Apps';
            matchedPrimaryBtn.setAttribute('href', '#apps');
            matchedSecondaryBtn.textContent = 'View on Google Play';
            matchedSecondaryBtn.setAttribute('href', 'https://play.google.com/store/apps/details?id=com.SilverByteGames.FaceTilesMatch');

            factPlatformFocus.textContent = 'Android & Windows';
            factTechStack.textContent = 'Jetpack Compose & Flutter';

            if (appsSection) {
                appsSection.classList.add('is-active-space');
                targetAnchor = appsSection;
            }

            // Spotlight consumer apps in shipped panel
            shippedItems.forEach(item => {
                const parentLi = item.closest('li');
                if (parentLi && parentLi.dataset.cardAudience && parentLi.dataset.cardAudience.includes('b2c')) {
                    item.classList.add('is-spotlight');
                }
            });

        } else if (space === 'games') {
            // Unity Games Space Active
            matchedBadgeText.textContent = 'Unity Games Portfolio Active';
            matchedHeadline.textContent = 'Tactile casual and physics-driven arcade games.';
            matchedDescription.textContent = 'Original puzzle and arcade titles engineered with the Unity engine, featuring responsive haptics, layered 3D board mechanics, and satisfying physics collisions.';
            
            matchedPrimaryBtn.textContent = 'Play Triple Tiles';
            matchedPrimaryBtn.setAttribute('href', '#games');
            matchedSecondaryBtn.textContent = 'See Game Features';
            matchedSecondaryBtn.setAttribute('href', 'triple-tiles.html');

            factPlatformFocus.textContent = 'Android & Google Play';
            factTechStack.textContent = 'Unity 3D Engine & C#';

            if (gamesSection) {
                gamesSection.classList.add('is-active-space');
                targetAnchor = gamesSection;
            }

            shippedItems.forEach(item => {
                const parentLi = item.closest('li');
                if (parentLi && parentLi.dataset.cardCategory === 'games') {
                    item.classList.add('is-spotlight');
                }
            });

        } else {
            // All Products View
            matchedBadgeText.textContent = 'Full Studio Portfolio Active';
            matchedHeadline.textContent = 'Polished apps and games, built and shipped in-house.';
            matchedDescription.textContent = 'Silverbyte Studio designs, builds and maintains its own Android apps, desktop tools and Unity games, and builds custom software for businesses with the same care.';
            
            matchedPrimaryBtn.textContent = 'Explore All Products';
            matchedPrimaryBtn.setAttribute('href', '#business-space');
            matchedSecondaryBtn.textContent = 'Work With Us';
            matchedSecondaryBtn.setAttribute('href', 'business.html');

            factPlatformFocus.textContent = 'Android, Windows & Web';
            factTechStack.textContent = 'Unity, Compose, Supabase';

            if (b2bSection) targetAnchor = b2bSection;
        }

        // Smooth scroll if triggered by user interaction
        if (shouldScroll && targetAnchor) {
            setTimeout(() => {
                targetAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}
