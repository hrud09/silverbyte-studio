/**
 * Silverbyte Studio CMS renderer.
 *
 * Turns content/site.json into HTML and writes it into the regions of each page
 * marked with <!-- cms:name --> ... <!-- /cms:name -->. Everything outside those
 * markers is left untouched. Pure string functions, so the same code runs in the
 * admin panel (browser) and in scripts/build.mjs (Node).
 */

const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const indent = (html, n) => {
    const pad = ' '.repeat(n);
    return html.split('\n').map(line => (line ? pad + line : line)).join('\n');
};

const PLAY_ICON = `<svg class="btn-badge-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M3.608 1.62C3.238 2.016 3 2.622 3 3.414v17.172c0 .792.238 1.398.608 1.794l.092.086 9.617-9.617v-2.148L3.7 1.534l-.092.086z" fill="#00D2FF"/>
    <path d="M16.535 16.07l-3.218-3.219v-2.148l3.218-3.219.073.042 3.812 2.167c1.089.618 1.089 1.632 0 2.25l-3.812 2.167-.073.042z" fill="#FFC107"/>
    <path d="M13.317 12.851L3.608 22.56c.358.381.954.428 1.61.056l11.317-6.43-3.218-3.335z" fill="#FF4B2B"/>
    <path d="M13.317 10.701l3.218-3.335L5.218 1.384C4.562 1.012 3.966 1.059 3.608 1.44l9.709 9.261z" fill="#00E676"/>
</svg>`;

const GITHUB_ICON = `<svg class="btn-badge-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
</svg>`;

const STORE_ICON = `<svg class="btn-badge-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
</svg>`;

export const LINK_TYPES = {
    play: { sub: 'GET IT ON', title: 'Google Play', icon: PLAY_ICON },
    github: { sub: 'VIEW ON', title: 'GitHub', icon: GITHUB_ICON },
    web: { sub: 'OPEN', title: 'Website', icon: STORE_ICON },
    none: null,
};

export const CATEGORIES = {
    game: 'Game',
    app: 'Mobile app',
    desktop: 'Desktop app',
    business: 'Business (B2B)',
};

// Clean .html from URLs for professional appearance
const cleanUrl = (url) => {
    if (!url) return url;
    if (url === 'index.html') return '/';
    return url.replace(/\.html$/, '');
};

// Where a product links when it has no details page yet: its store link, else nowhere.
const hrefOf = (p) => (p.page ? cleanUrl(p.page) : p.link?.url || '#');

// Which audience a page is for: the homepage is the consumer (B2C) space, business.html the B2B space.
// Other pages (product details, legal) show everything.
const PAGE_AUDIENCE = { 'index.html': 'b2c', 'business.html': 'b2b' };
const audiencesOf = (p) => (p.audience || 'b2c').split(/\s+/);
const forPage = (p, file) => !PAGE_AUDIENCE[file] || audiencesOf(p).includes(PAGE_AUDIENCE[file]);

const visible = (data, where, file = '') => (data.products || [])
    .filter(p => p.show?.[where] !== false && p.name && forPage(p, file));

/* ---------- Fragments ---------- */

function navCard(p, file) {
    const current = p.page === file ? ' aria-current="page"' : '';
    const pill = p.navPill ? ` <span class="nav-pill">${esc(p.navPill)}</span>` : '';
    return `<a href="${esc(hrefOf(p))}" class="nav-card"${current}>
    <img src="${esc(p.icon)}" alt="" width="36" height="36" loading="lazy">
    <span class="nav-card-text">
        <span class="nav-card-title">${esc(p.name)}${pill}</span>
        <span class="nav-card-desc">${esc(p.navDesc)}</span>
    </span>
</a>`;
}

function navGroup(label, products, file) {
    if (!products.length) return '';
    return `<div class="nav-group">
    <p class="nav-group-label">${esc(label)}</p>
${indent(products.map(p => navCard(p, file)).join('\n'), 4)}
</div>`;
}

function renderNavGames(data, file) {
    const games = visible(data, 'nav', file).filter(p => p.category === 'game');
    return navGroup('Mobile games', games, file);
}

function renderNavApps(data, file) {
    const nav = visible(data, 'nav', file);
    const label = PAGE_AUDIENCE[file] === 'b2c' ? 'Desktop' : PAGE_AUDIENCE[file] === 'b2b' ? 'Business & Desktop' : 'Desktop & Business';
    return [
        navGroup('Mobile apps', nav.filter(p => p.category === 'app'), file),
        navGroup(label, nav.filter(p => p.category === 'desktop' || p.category === 'business'), file),
    ].filter(Boolean).join('\n');
}

function renderFooterProducts(data, file) {
    return visible(data, 'footer', file)
        .map(p => `<li><a href="${esc(hrefOf(p))}">${esc(p.name)}</a></li>`)
        .join('\n');
}

function renderDefaultSpace(data) {
    const space = data.settings?.defaultSpace === 'business' ? 'business' : 'customers';
    // Visitors arriving from outside the site land on the default space. Links between
    // the two spaces (same-origin referrer), #anchors and ?space=customers are respected.
    return `<script>(function(){var d=${JSON.stringify(space)};if(d!=="business")return;if(location.hash||/[?&]space=customers/.test(location.search))return;try{if(document.referrer&&new URL(document.referrer).origin===location.origin)return;}catch(e){}location.replace("business");})();</script>`;
}

function renderHeroSection(data, file) {
    const show = data.hero?.show !== false;
    return `<section class="hero hero-split" id="hero"${show ? '' : ' hidden'}>`;
}

function renderHeroIntro(data, file) {
    if (file === 'business.html') {
        const b = data.sections?.business || {};
        return `<p class="eyebrow">
    <span class="eyebrow-dots" aria-hidden="true"><span></span><span></span><span></span></span>
    Business Solutions
</p>
<h1>${esc(b.title ? 'Software Built for Businesses' : 'Software Built for Businesses')}</h1>
<p class="lead">${esc(b.subtitle || 'Custom platforms, management systems and operational software for companies and growing teams.')}</p>`;
    }
    const h = data.hero || {};
    return `<p class="eyebrow">
    <span class="eyebrow-dots" aria-hidden="true"><span></span><span></span><span></span></span>
    ${esc(h.eyebrow)}
</p>
<h1>${esc(h.title)}</h1>
<p class="lead">${esc(h.lead)}</p>`;
}

function showcaseList(data, file) {
    return visible(data, 'showcase', file).filter(p => p.banner);
}

function renderShowcaseSlides(data, file) {
    const list = showcaseList(data, file);
    return list.map((p, i) => {
        const tag = p.showcaseTag ? ` <span class="showcase-tag">${esc(p.showcaseTag)}</span>` : '';
        const lazy = i === 0 ? '' : ' loading="lazy"';
        return `<li class="showcase-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}: ${esc(p.name)}">
    <a href="${esc(hrefOf(p))}" class="showcase-link">
        <img class="showcase-media" src="${esc(p.banner)}" alt="${esc(p.name)}"${lazy} decoding="async">
        <span class="showcase-caption">
            <span class="showcase-title">${esc(p.name)}${tag}</span>
            <span class="showcase-meta">${esc(p.showcaseMeta)}</span>
        </span>
    </a>
</li>`;
    }).join('\n');
}

function renderShowcaseCount(data, file) {
    const n = String(showcaseList(data, file).length).padStart(2, '0');
    return `<span class="showcase-count" aria-hidden="true"><span class="showcase-count-cur">01</span> / ${n}</span>`;
}

function renderShipped(data, file) {
    const list = visible(data, 'shipped', file);
    const items = list.map(p => {
        const b2b = p.category === 'business';
        const cls = b2b ? 'shipped-item shipped-item--b2b' : 'shipped-item';
        const pill = b2b ? ` <span class="shipped-badge-pill">${esc(p.navPill || 'B2B')}</span>` : '';
        return `<li data-card-audience="${esc(p.audience || 'b2c')}" data-card-category="${esc(p.shippedCategory || p.category)}"><a href="${esc(hrefOf(p))}" class="${cls}">
    <img src="${esc(p.icon)}" alt="${esc(p.name)}" width="40" height="40" loading="lazy">
    <span class="shipped-name">${esc(p.name)}${pill}</span>
    <span class="shipped-meta">${esc(p.shippedMeta)}</span>
</a></li>`;
    }).join('\n');
    return `<p class="shipped-panel-title"><span>Shipped by us</span><span class="shipped-panel-count" id="shipped-count-display">${String(list.length).padStart(2, '0')}</span></p>
<ul class="shipped-list" id="hero-shipped-list">
${indent(items, 4)}
</ul>`;
}

function renderHeading(sec = {}, { eyebrow = true } = {}) {
    const parts = [];
    if (eyebrow) parts.push(`<p class="eyebrow">${esc(sec.eyebrow)}</p>`);
    parts.push(`<h2 class="section-title">${esc(sec.title)}</h2>`);
    if (sec.subtitle) parts.push(`<p class="section-subtitle">${esc(sec.subtitle)}</p>`);
    return parts.join('\n');
}

function renderSupportHeading(sec = {}) {
    return `<p class="eyebrow">${esc(sec.eyebrow)}</p>
<h2 class="section-title">${esc(sec.title)}</h2>
<p class="contact-lead">
    ${esc(sec.subtitle)}
</p>`;
}

function badge(b) {
    const style = ['success', 'amber', 'subtle'].includes(b.style) ? b.style : 'subtle';
    const dot = b.dot ? '<span class="dot"></span> ' : '';
    return `<span class="badge badge-${style}">${dot}${esc(b.text)}</span>`;
}

function portalCard(p) {
    const banner = p.banner ? `    <div class="portal-card-banner">
        <img src="${esc(p.banner)}" alt="${esc(p.bannerAlt || p.cardTitle || p.name)}" loading="lazy">
    </div>
` : '';
    const bodyCls = p.banner ? 'portal-card-body' : 'portal-card-body portal-card-body--no-banner';
    const badges = (p.badges || []).filter(b => b.text).map(badge).join('\n');
    const lt = LINK_TYPES[p.link?.type];
    let action = '';
    if (lt && p.link.url) {
        action = `<a href="${esc(p.link.url)}" target="_blank" rel="noopener noreferrer" class="btn-badge btn-badge-sm">
${indent(lt.icon, 4)}
    <span class="btn-badge-content">
        <span class="btn-badge-sub">${lt.sub}</span>
        <span class="btn-badge-title">${lt.title}</span>
    </span>
</a>`;
    } else if (p.pendingLabel) {
        action = `<span class="badge badge-amber">${esc(p.pendingLabel)}</span>`;
    }
    const details = p.page ? `<a href="${esc(cleanUrl(p.page))}" class="btn btn-secondary btn-sm">
    ${esc(p.detailsLabel || 'View Details')} &rarr;
</a>` : '';
    return `<article class="portal-card" data-audience="${esc((p.audience || 'b2c').split(' ')[0])}">
${banner}    <div class="${bodyCls}">
        <div class="portal-card-header">
            <img src="${esc(p.icon)}" alt="${esc(p.name)} Icon" class="portal-card-icon" width="54" height="54">
            <div>
                <h3 class="portal-card-title">${esc(p.cardTitle || p.name)}</h3>
                <div class="tag-list">
${indent(badges, 20)}
                </div>
            </div>
        </div>
        <p class="portal-card-desc">
            ${esc(p.description)}
        </p>
        <div class="portal-card-footer">
${indent([details, action].filter(Boolean).join('\n'), 12)}
        </div>
    </div>
</article>`;
}

function renderGrid(data, category, file) {
    return visible(data, 'grid', file)
        .filter(p => p.category === category)
        .map(portalCard)
        .join('\n\n');
}

/* ---------- Region table ---------- */

export const REGIONS = {
    'default-space': renderDefaultSpace,
    'hero-section': renderHeroSection,
    'nav-games': renderNavGames,
    'nav-apps': renderNavApps,
    'footer-products': renderFooterProducts,
    'hero-intro': renderHeroIntro,
    'showcase-slides': renderShowcaseSlides,
    'showcase-count': renderShowcaseCount,
    'shipped': renderShipped,
    'business-heading': (d) => renderHeading(d.sections?.business, { eyebrow: false }),
    'games-heading': (d) => renderHeading(d.sections?.games),
    'games-grid': (d, f) => renderGrid(d, 'game', f),
    'apps-heading': (d) => renderHeading(d.sections?.apps),
    'apps-grid': (d, f) => renderGrid(d, 'app', f),
    'desktop-heading': (d) => renderHeading(d.sections?.desktop),
    'desktop-grid': (d, f) => renderGrid(d, 'desktop', f),
    'about-heading': (d) => renderHeading(d.sections?.about),
    'support-heading': (d) => renderSupportHeading(d.sections?.support),
};

/** Products whose details page is not in `existingFiles` (warnings, not errors). */
export function missingPages(data, existingFiles) {
    const have = new Set(existingFiles);
    return (data.products || []).filter(p => p.page && !have.has(p.page)).map(p => `${p.name}: page "${p.page}" does not exist.`);
}

const REGION_RE = /([ \t]*)<!-- cms:([a-z0-9-]+) -->[\s\S]*?<!-- \/cms:\2 -->/g;

/** Replace every known cms region in a page. `file` is the page's file name (e.g. "clipr.html"). */
export function renderPage(html, data, file = '') {
    return html.replace(REGION_RE, (match, pad, name) => {
        const fn = REGIONS[name];
        if (!fn) return match;
        const inner = fn(data, file);
        const body = inner ? indent(inner, pad.length) + '\n' : '';
        return `${pad}<!-- cms:${name} -->\n${body}${pad}<!-- /cms:${name} -->`;
    });
}

/** Names of the cms regions a page contains. */
export function regionsIn(html) {
    return [...html.matchAll(REGION_RE)].map(m => m[2]);
}

/** Basic checks before publishing. Returns a list of human-readable problems. */
export function validate(data) {
    const problems = [];
    const ids = new Set();
    (data.products || []).forEach((p, i) => {
        const label = p.name || `Product #${i + 1}`;
        if (!p.name) problems.push(`${label}: name is required.`);
        if (!p.id) problems.push(`${label}: id is required.`);
        else if (ids.has(p.id)) problems.push(`${label}: id "${p.id}" is used twice.`);
        ids.add(p.id);
        if (!CATEGORIES[p.category]) problems.push(`${label}: pick a category.`);
        if (!p.icon) problems.push(`${label}: icon is required.`);
        if (p.link?.type && p.link.type !== 'none' && !/^https?:\/\//.test(p.link.url || '')) {
            problems.push(`${label}: store link must start with https://`);
        }
    });
    return problems;
}
