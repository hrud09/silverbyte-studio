/**
 * Silverbyte Admin
 *
 * Edits content/site.json and publishes it to GitHub. On publish, every page's
 * <!-- cms:... --> regions are re-rendered in the browser (assets/js/cms-render.js)
 * and committed together with the JSON and any uploaded images in one commit.
 * GitHub Pages then redeploys the static site.
 *
 * Opened on localhost with no token, it can run in "local" mode: it reads the
 * files from this server and exports site.json instead of publishing.
 */
import { renderPage, validate, missingPages, CATEGORIES, LINK_TYPES } from '../assets/js/cms-render.js';

const DEFAULT_REPO = { owner: 'hrud09', repo: 'silverbyte-studio', branch: 'main' };
const DATA_PATH = 'content/site.json';
const KEY_AUTH = 'sb-admin-auth';
const KEY_DRAFT = 'sb-admin-draft';
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

const app = document.getElementById('app');
const dialog = document.getElementById('dialog');
const toastEl = document.getElementById('toast');

/* =========================================================================
   Helpers
   ========================================================================= */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const clone = (o) => JSON.parse(JSON.stringify(o));
const serialize = (data) => JSON.stringify(data, null, 2) + '\n';

function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k, i) => {
        if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
        o = o[k];
    });
    o[keys[keys.length - 1]] = value;
}

function decodeBase64Utf8(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function timeAgo(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return new Date(ts).toLocaleDateString();
}

const storage = {
    get(key) {
        try { return JSON.parse(localStorage.getItem(key) ?? sessionStorage.getItem(key)); } catch { return null; }
    },
    set(key, value, persist = true) {
        try {
            (persist ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
            (persist ? sessionStorage : localStorage).removeItem(key);
        } catch { /* storage unavailable */ }
    },
    del(key) {
        try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch { /* ignore */ }
    },
};

let toastTimer;
function toast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('is-error', isError);
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, isError ? 6000 : 3500);
}

const I = {
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
};

/* =========================================================================
   Backends
   ========================================================================= */

class GitHubBackend {
    constructor(repo, token) {
        this.repo = repo;
        this.token = token;
        this.kind = 'github';
    }

    async req(method, path, body) {
        const { owner, repo } = this.repo;
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                ...(body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
            cache: 'no-store',
        });
        if (!res.ok) {
            let msg = res.statusText;
            try { msg = (await res.json()).message || msg; } catch { /* not json */ }
            const err = new Error(msg);
            err.status = res.status;
            throw err;
        }
        return res.status === 204 ? null : res.json();
    }

    async verify() {
        const info = await this.req('GET', '');
        if (!info.permissions?.push) {
            throw new Error('This token can read the repository but cannot write to it. Give it "Contents: Read and write".');
        }
        return info;
    }

    async head() {
        const ref = await this.req('GET', `/git/ref/heads/${encodeURIComponent(this.repo.branch)}`);
        const commit = await this.req('GET', `/git/commits/${ref.object.sha}`);
        return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
    }

    async load() {
        const { branch } = this.repo;
        const ref = await this.req('GET', `/git/ref/heads/${encodeURIComponent(branch)}`);
        const commitSha = ref.object.sha;
        const commit = await this.req('GET', `/git/commits/${commitSha}`);
        const tree = await this.req('GET', `/git/trees/${commit.tree.sha}?recursive=1`);
        const blobs = tree.tree.filter(t => t.type === 'blob');
        const shaOf = Object.fromEntries(blobs.map(b => [b.path, b.sha]));
        const paths = blobs.map(b => b.path);
        const wanted = paths.filter(p => (!p.includes('/') && p.endsWith('.html')) || p === DATA_PATH);
        const texts = {};
        await Promise.all(wanted.map(async (p) => {
            const blob = await this.req('GET', `/git/blobs/${shaOf[p]}`);
            texts[p] = decodeBase64Utf8(blob.content);
        }));
        return { base: { commitSha, treeSha: commit.tree.sha, at: commit.committer?.date }, paths, texts };
    }

    async commit(base, files, message) {
        const tree = [];
        for (const f of files) {
            if (f.base64) {
                const blob = await this.req('POST', '/git/blobs', { content: f.base64, encoding: 'base64' });
                tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
            } else {
                tree.push({ path: f.path, mode: '100644', type: 'blob', content: f.text });
            }
        }
        const newTree = await this.req('POST', '/git/trees', { base_tree: base.treeSha, tree });
        const commit = await this.req('POST', '/git/commits', { message, tree: newTree.sha, parents: [base.commitSha] });
        await this.req('PATCH', `/git/refs/heads/${encodeURIComponent(this.repo.branch)}`, { sha: commit.sha, force: false });
        return commit;
    }
}

class LocalBackend {
    constructor() { this.kind = 'local'; this.repo = { owner: 'local', repo: location.host, branch: 'files' }; }

    async load() {
        const get = async (p) => {
            const res = await fetch(`../${p}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Could not read ${p} (${res.status})`);
            return res.text();
        };
        const texts = { [DATA_PATH]: await get(DATA_PATH) };
        let pages = [];
        try {
            // python -m http.server lists directories; use it to discover pages
            const listing = await get('');
            pages = [...listing.matchAll(/href="([^"/?#]+\.html)"/g)].map(m => decodeURIComponent(m[1]));
        } catch { /* no listing */ }
        if (!pages.length) pages = ['index.html', 'business.html'];
        await Promise.all(pages.map(async p => { try { texts[p] = await get(p); } catch { /* skip */ } }));
        return { base: { commitSha: 'local', treeSha: 'local' }, paths: Object.keys(texts), texts };
    }
}

/* =========================================================================
   State
   ========================================================================= */

const state = {
    backend: null,
    base: null,
    paths: [],
    texts: {},
    data: null,
    savedJson: '',
    images: {},          // path -> { base64, dataUrl, size }
    view: 'products',    // products | product | text | settings | preview
    editingIndex: -1,
    filter: 'all',
    previewPage: 'index.html',
    previewMobile: false,
    draft: null,         // draft found in storage on load
    lastPublish: null,
};

const isDirty = () => serialize(state.data) !== state.savedJson || Object.keys(state.images).length > 0;
const repoKey = () => `${state.backend.repo.owner}/${state.backend.repo.repo}@${state.backend.repo.branch}`;
const imgSrc = (path) => !path ? '' : (state.images[path]?.dataUrl || `../${path}`);
const pages = () => state.paths.filter(p => !p.includes('/') && p.endsWith('.html')).sort();

let draftTimer;
function changed({ rerender = false } = {}) {
    refreshChrome();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
        if (isDirty()) storage.set(KEY_DRAFT, { repo: repoKey(), data: state.data, savedAt: Date.now() });
        else storage.del(KEY_DRAFT);
    }, 400);
    if (rerender) renderView();
}

window.addEventListener('beforeunload', (e) => {
    if (state.data && isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

/* =========================================================================
   PIN lock (per device)
   -------------------------------------------------------------------------
   The site is static, so there is no server to check a PIN. Instead, on each
   device, the GitHub token is encrypted with a 4–6 digit PIN
   (PBKDF2-SHA256 → AES-GCM) and kept in this browser's localStorage only. It
   is never committed or published: a PIN is far too short to protect a
   public file. Entering the right PIN decrypts the token; a wrong one fails.
   Repeated wrong PINs slow down, and too many erase the token from this
   device, so it has to be set up again with a GitHub token.
   The unlocked token lives in sessionStorage and is gone when the tab closes.
   ========================================================================= */

const KEY_VAULT = 'sb-admin-vault';
const KDF_ITERATIONS = 600000;
const PIN_RE = /^\d{4,6}$/;
const FREE_ATTEMPTS = 5;        // wrong PINs before a wait kicks in
const MAX_ATTEMPTS = 10;        // wrong PINs before the token is erased
const BASE_WAIT_MS = 30 * 1000; // doubles with each wrong PIN after FREE_ATTEMPTS

const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(pin, salt, iterations) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
    );
}

async function encryptVault(token, pin, repo) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pin, salt, KDF_ITERATIONS);
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ token })));
    return {
        version: 2,
        repo,
        kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: b64(salt) },
        cipher: { name: 'AES-GCM', iv: b64(iv), data: b64(data) },
        fails: 0,
        lockedUntil: 0,
    };
}

async function decryptVault(vault, pin) {
    const key = await deriveKey(pin, unb64(vault.kdf.salt), vault.kdf.iterations);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.cipher.iv) }, key, unb64(vault.cipher.data));
    return JSON.parse(new TextDecoder().decode(plain)).token;
}

const getVault = () => {
    const v = storage.get(KEY_VAULT);
    return v?.cipher?.data ? v : null;
};
const saveVault = (vault) => storage.set(KEY_VAULT, vault, true);
const forgetDevice = () => { storage.del(KEY_VAULT); storage.del(KEY_AUTH); };
/** The unlocked token is kept for this tab only. */
const setSession = (token, repo) => storage.set(KEY_AUTH, { token, repo }, false);

const isLocalHost = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

const pinInput = (name, autocomplete) =>
    `<input class="input input-pin" type="password" name="${name}" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" autocomplete="${autocomplete}" required>`;
const digitsOnly = (form) => form.querySelectorAll('.input-pin').forEach(el =>
    el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, 6); }));

function authShell(inner) {
    app.innerHTML = `
    <main class="signin">
        <div class="signin-card">
            <div class="signin-brand">
                <img src="../assets/images/studio-logo.png" alt="">
                <strong style="color:var(--text-main)">Silverbyte Studio</strong>
            </div>
            ${inner}
            ${isLocalHost() ? `<div class="signin-alt"><button class="btn btn-ghost btn-sm" type="button" data-action="local">Open local files instead (no publishing)</button></div>` : ''}
        </div>
    </main>`;
}

const fmtWait = (ms) => {
    const s = Math.ceil(ms / 1000);
    return s < 60 ? `${s} s` : `${Math.ceil(s / 60)} min`;
};

let lockTimer;
function renderLock(error = '') {
    clearInterval(lockTimer);
    const vault = getVault();
    if (!vault) return renderSetup(error);
    const waitMs = () => Math.max(0, (vault.lockedUntil || 0) - Date.now());
    const left = MAX_ATTEMPTS - (vault.fails || 0);

    authShell(`
        <h1>Admin</h1>
        <p class="signin-lead">Enter your PIN to edit the site.</p>
        <form id="lock-form" novalidate>
            <label class="field">
                <span>PIN</span>
                ${pinInput('pin', 'current-password')}
            </label>
            ${error ? `<p class="error-text" role="alert">${esc(error)}</p>` : ''}
            <p class="muted" id="lock-wait" style="font-size:13px" hidden></p>
            <button class="btn btn-primary" type="submit">Unlock</button>
        </form>
        <div class="signin-help">Forgot the PIN? <button class="btn btn-ghost btn-sm" style="padding:0 4px;height:auto;color:var(--primary)" type="button" data-action="setup">Set it up again with a GitHub token</button>
            ${vault.fails ? `<p style="margin-top:8px">${left} attempt${left === 1 ? '' : 's'} left before the token is erased from this device.</p>` : ''}
        </div>`);

    const form = document.getElementById('lock-form');
    const btn = form.querySelector('button[type=submit]');
    const waitEl = document.getElementById('lock-wait');
    digitsOnly(form);

    const tick = () => {
        const ms = waitMs();
        btn.disabled = ms > 0;
        waitEl.hidden = ms === 0;
        waitEl.textContent = `Too many wrong PINs. Try again in ${fmtWait(ms)}.`;
        if (!ms) clearInterval(lockTimer);
    };
    tick();
    if (waitMs()) lockTimer = setInterval(tick, 1000);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (waitMs()) return;
        const pin = form.pin.value;
        if (!PIN_RE.test(pin)) return renderLock('Enter your 4–6 digit PIN.');
        btn.disabled = true;
        btn.textContent = 'Unlocking…';
        let token;
        try {
            token = await decryptVault(vault, pin);
        } catch {
            vault.fails = (vault.fails || 0) + 1;
            if (vault.fails >= MAX_ATTEMPTS) {
                forgetDevice();
                return renderSetup('Too many wrong PINs, so the token was erased from this device. Set it up again with a GitHub token.');
            }
            if (vault.fails >= FREE_ATTEMPTS) vault.lockedUntil = Date.now() + BASE_WAIT_MS * 2 ** (vault.fails - FREE_ATTEMPTS);
            saveVault(vault);
            await new Promise(r => setTimeout(r, 600));
            return renderLock('Wrong PIN.');
        }
        vault.fails = 0;
        vault.lockedUntil = 0;
        saveVault(vault);
        const repo = vault.repo || DEFAULT_REPO;
        setSession(token, repo);
        start(new GitHubBackend(repo, token));
    });
    form.pin.focus();
}

function renderSetup(error = '') {
    clearInterval(lockTimer);
    const vault = getVault();
    const repo = vault?.repo || DEFAULT_REPO;
    const reset = Boolean(vault);
    authShell(`
        <h1>${reset ? 'Reset your PIN' : 'Set up this device'}</h1>
        <p class="signin-lead">${reset
            ? 'Paste a GitHub token with write access to prove you own the site, then choose a new PIN for this device.'
            : 'One-time setup on this device. Paste a GitHub token and choose a 4–6 digit PIN. The token is stored encrypted in this browser only, never published.'}</p>
        <form id="setup-form" novalidate>
            <label class="field">
                <span>GitHub access token</span>
                <input class="input mono" type="password" name="token" autocomplete="off" spellcheck="false" placeholder="github_pat_…" required>
            </label>
            <details>
                <summary class="muted" style="cursor:pointer;font-size:13px">Repository: <span class="mono">${esc(repo.owner)}/${esc(repo.repo)}</span> · <span class="mono">${esc(repo.branch)}</span></summary>
                <div class="grid-3" style="margin-top:10px">
                    <label class="field"><span>Owner</span><input class="input mono" name="owner" value="${esc(repo.owner)}"></label>
                    <label class="field"><span>Repository</span><input class="input mono" name="repo" value="${esc(repo.repo)}"></label>
                    <label class="field"><span>Branch</span><input class="input mono" name="branch" value="${esc(repo.branch)}"></label>
                </div>
            </details>
            <label class="field">
                <span>New PIN</span>
                ${pinInput('pin', 'new-password')}
                <small>4 to 6 digits. Each device you use has its own PIN.</small>
            </label>
            <label class="field">
                <span>Repeat PIN</span>
                ${pinInput('confirm', 'new-password')}
            </label>
            ${error ? `<p class="error-text" role="alert">${esc(error)}</p>` : ''}
            <button class="btn btn-primary" type="submit">${reset ? 'Reset PIN' : 'Save and continue'}</button>
        </form>
        <div class="signin-help">
            <strong style="color:var(--text-body)">Getting a token</strong>
            <ol>
                <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub → Fine-grained tokens</a>.</li>
                <li>Repository access: <em>Only select repositories</em> → this site's repo.</li>
                <li>Permissions → Repository → <em>Contents: Read and write</em>. Nothing else.</li>
                <li>Set an expiry you're comfortable with; set up again when it expires.</li>
            </ol>
            ${reset ? '<p style="margin-top:10px"><button class="btn btn-ghost btn-sm" style="padding:0" type="button" data-action="lock">← Back to PIN</button></p>' : ''}
        </div>`);

    const form = document.getElementById('setup-form');
    digitsOnly(form);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const token = String(f.get('token') || '').trim();
        const pin = String(f.get('pin') || '');
        const repoCfg = {
            owner: String(f.get('owner') || '').trim() || DEFAULT_REPO.owner,
            repo: String(f.get('repo') || '').trim() || DEFAULT_REPO.repo,
            branch: String(f.get('branch') || '').trim() || DEFAULT_REPO.branch,
        };
        if (!token) return renderSetup('Paste a GitHub token.');
        if (!PIN_RE.test(pin)) return renderSetup('The PIN must be 4 to 6 digits.');
        if (pin !== f.get('confirm')) return renderSetup('The two PINs don\'t match.');
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Checking token…';
        const backend = new GitHubBackend(repoCfg, token);
        try {
            await backend.verify();
            btn.textContent = 'Saving…';
            saveVault(await encryptVault(token, pin, repoCfg));
        } catch (err) {
            const msg = err.status === 401 ? 'GitHub rejected this token. Check it was copied completely and has not expired.'
                : err.status === 404 ? `Repository ${repoCfg.owner}/${repoCfg.repo} was not found, or this token has no access to it.`
                    : err.message;
            return renderSetup(msg);
        }
        setSession(token, repoCfg);
        toast('PIN saved on this device.');
        start(backend);
    });
    form.token.focus();
}

function renderSignIn(error = '') {
    if (getVault()) renderLock(error);
    else renderSetup(error);
}

function changePinDialog() {
    openDialog(`<form method="dialog" id="pw-form">
        <div class="dialog-body">
            <h2>Change PIN</h2>
            <p class="muted">Changes the PIN on this device only. Other devices keep their own PIN.</p>
            <label class="field"><span>New PIN</span>${pinInput('pin', 'new-password')}<small>4 to 6 digits.</small></label>
            <label class="field"><span>Repeat PIN</span>${pinInput('confirm', 'new-password')}</label>
            <p class="error-text" id="pw-error" role="alert" hidden></p>
        </div>
        <div class="dialog-actions">
            <button class="btn btn-ghost" type="button" data-action="close-dialog">Cancel</button>
            <button class="btn btn-primary" type="submit" id="pw-save">Save PIN</button>
        </div>
    </form>`);
    const form = document.getElementById('pw-form');
    const errEl = document.getElementById('pw-error');
    const fail = (msg) => { errEl.textContent = msg; errEl.hidden = false; };
    digitsOnly(form);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = form.pin.value;
        if (!PIN_RE.test(pin)) return fail('The PIN must be 4 to 6 digits.');
        if (pin !== form.confirm.value) return fail('The two PINs don\'t match.');
        const btn = document.getElementById('pw-save');
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
            saveVault(await encryptVault(state.backend.token, pin, state.backend.repo));
            closeDialog();
            toast('PIN changed.');
        } catch (err) {
            btn.disabled = false;
            btn.textContent = 'Save PIN';
            fail(`Could not save: ${err.message}`);
        }
    });
}

function forgetDeviceDialog() {
    confirmDialog('Forget this device?', 'Erases the encrypted GitHub token from this browser and signs you out. Unpublished edits are lost. To use the admin here again you\'ll need a GitHub token.', 'Forget device', () => {
        forgetDevice();
        storage.del(KEY_DRAFT);
        state.data = null;
        state.images = {};
        renderSetup();
    });
}

/* =========================================================================
   Load
   ========================================================================= */

async function start(backend) {
    state.backend = backend;
    app.innerHTML = '<div class="loading">Loading site content…</div>';
    try {
        await loadSnapshot();
    } catch (err) {
        if (backend.kind === 'github' && (err.status === 401 || err.status === 403)) {
            forgetDevice();
            return renderSetup('The saved GitHub token no longer works (expired or revoked). Set up again with a new token.');
        }
        app.innerHTML = `<div class="loading"><div style="text-align:center;display:grid;gap:12px">
            <p class="error-text">Could not load the site: ${esc(err.message)}</p>
            <div><button class="btn" data-action="retry">Try again</button> <button class="btn btn-ghost" data-action="signout">Sign out</button></div>
        </div></div>`;
        return;
    }
    const draft = storage.get(KEY_DRAFT);
    state.draft = draft && draft.repo === repoKey() && serialize(draft.data) !== state.savedJson ? draft : null;
    renderShell();
}

async function loadSnapshot({ keepData = false } = {}) {
    const snap = await state.backend.load();
    if (!snap.texts[DATA_PATH]) throw new Error(`${DATA_PATH} is missing from the repository.`);
    state.base = snap.base;
    state.paths = snap.paths;
    state.texts = snap.texts;
    const remote = JSON.parse(snap.texts[DATA_PATH]);
    state.savedJson = serialize(remote);
    if (!keepData) state.data = remote;
}

/* =========================================================================
   Shell
   ========================================================================= */

function renderShell() {
    const repo = state.backend.repo;
    const local = state.backend.kind === 'local';
    app.innerHTML = `
    <header class="topbar">
        <a class="topbar-brand" href="../index.html" target="_blank" rel="noopener" title="Open the live site">
            <img src="../assets/images/studio-logo.png" alt=""> <span>Silverbyte Admin</span>
        </a>
        <span class="topbar-repo mono">${local ? 'local files' : `${esc(repo.owner)}/${esc(repo.repo)} · ${esc(repo.branch)}`}</span>
        <span class="topbar-spacer"></span>
        <span class="status-pill" id="status-pill"></span>
        <a class="btn btn-ghost btn-sm hide-sm" href="../index.html" target="_blank" rel="noopener">${I.external} View site</a>
        <button class="btn btn-primary btn-sm" id="publish-btn" data-action="publish">${local ? 'Export' : 'Publish'}</button>
    </header>
    <div class="layout">
        <nav class="sidebar" aria-label="Admin sections">
            <button class="side-link" data-action="nav" data-view="products">${I.box} Products <span class="side-count" id="product-count"></span></button>
            <button class="side-link" data-action="nav" data-view="text">${I.text} Homepage text</button>
            <button class="side-link" data-action="nav" data-view="settings">${I.gear} Settings</button>
            <button class="side-link" data-action="nav" data-view="preview">${I.eye} Preview</button>
            <div class="side-foot">
                <span>${local ? 'Local mode: changes are exported, not published.' : `Last loaded ${state.base.at ? esc(timeAgo(Date.parse(state.base.at))) : ''}`}</span>
                <button class="btn btn-ghost btn-sm" data-action="signout" style="justify-self:start;padding:0">Sign out</button>
            </div>
        </nav>
        <main class="main" id="main"></main>
    </div>`;
    renderView();
}

function refreshChrome() {
    const pill = document.getElementById('status-pill');
    if (!pill) return;
    const dirty = isDirty();
    const local = state.backend.kind === 'local';
    pill.textContent = dirty ? 'Unpublished changes' : (local ? 'Local files' : 'Up to date');
    pill.classList.toggle('is-dirty', dirty);
    pill.classList.toggle('is-local', local && !dirty);
    document.getElementById('publish-btn').disabled = !dirty && !local;
    document.getElementById('product-count').textContent = state.data.products.length;
    const active = state.view === 'product' ? 'products' : state.view;
    document.querySelectorAll('.side-link[data-view]').forEach(b => {
        if (b.dataset.view === active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
}

function renderView() {
    const main = document.getElementById('main');
    if (!main) return;
    const views = { products: viewProducts, product: viewProduct, text: viewText, settings: viewSettings, preview: viewPreview };
    main.innerHTML = notices() + (views[state.view] || viewProducts)();
    refreshChrome();
    if (state.view === 'preview') mountPreview();
    if (state.view === 'products') bindDrag();
}

function notices() {
    let html = '';
    if (state.draft) {
        html += `<div class="banner"><p>You have unpublished edits from ${esc(timeAgo(state.draft.savedAt))} saved in this browser.</p>
            <button class="btn btn-primary btn-sm" data-action="draft-restore">Restore them</button>
            <button class="btn btn-ghost btn-sm" data-action="draft-discard">Discard</button></div>`;
    }
    if (state.lastPublish) {
        html += `<div class="banner" style="border-color:rgba(52,211,153,.28);background:var(--success-tint)"><p>Published ${esc(timeAgo(state.lastPublish.at))}. GitHub Pages usually updates the live site within a minute or two.</p>
            ${state.lastPublish.url ? `<a class="btn btn-sm" href="${esc(state.lastPublish.url)}" target="_blank" rel="noopener noreferrer">View commit</a>` : ''}
            <button class="btn btn-ghost btn-sm" data-action="dismiss-publish">Dismiss</button></div>`;
    }
    return html;
}

/* =========================================================================
   Products list
   ========================================================================= */

const FILTERS = [['all', 'All'], ...Object.entries({ game: 'Games', app: 'Mobile apps', desktop: 'Desktop', business: 'Business' })];
const PLACES = [['nav', 'Menu'], ['showcase', 'Slideshow'], ['shipped', 'Shipped list'], ['grid', 'Section card'], ['footer', 'Footer']];

function viewProducts() {
    const list = state.data.products.map((p, i) => ({ p, i })).filter(({ p }) => state.filter === 'all' || p.category === state.filter);
    const rows = list.map(({ p, i }) => `
        <li class="prow" draggable="true" data-index="${i}">
            <span class="prow-handle" title="Drag to reorder">${I.grip}</span>
            ${p.icon ? `<img class="prow-icon" src="${esc(imgSrc(p.icon))}" alt="">` : '<span class="prow-icon"></span>'}
            <div class="prow-main">
                <div class="prow-name"><button data-action="edit" data-index="${i}">${esc(p.name || 'Untitled product')}</button> <span class="tag tag-cat">${esc(CATEGORIES[p.category] || '—')}</span></div>
                <div class="prow-sub">${esc(p.navDesc || p.description || '')}</div>
            </div>
            <div class="prow-where">${PLACES.map(([k, label]) => {
                const on = p.show?.[k] !== false && !(k === 'showcase' && !p.banner) && !(k === 'grid' && p.category === 'business');
                return `<span class="tag ${on ? '' : 'is-off'}" title="${on ? 'Shown in' : 'Hidden from'} ${label}">${label}</span>`;
            }).join('')}</div>
            <div class="prow-actions">
                <button class="btn btn-ghost btn-icon" data-action="move" data-index="${i}" data-dir="-1" aria-label="Move ${esc(p.name)} up">${I.up}</button>
                <button class="btn btn-ghost btn-icon" data-action="move" data-index="${i}" data-dir="1" aria-label="Move ${esc(p.name)} down">${I.down}</button>
                <button class="btn btn-ghost btn-icon" data-action="edit" data-index="${i}" aria-label="Edit ${esc(p.name)}">${I.edit}</button>
            </div>
        </li>`).join('');

    return `
    <div class="page-head">
        <div>
            <h1>Products</h1>
            <p>Games and apps shown across the site. The order here is the order on the site.</p>
        </div>
        <button class="btn btn-primary" data-action="add">${I.plus} Add product</button>
    </div>
    <div class="toolbar" role="group" aria-label="Filter by category">
        ${FILTERS.map(([k, label]) => `<button class="chip" data-action="filter" data-filter="${k}" aria-pressed="${state.filter === k}">${label}</button>`).join('')}
    </div>
    ${list.length ? `<ul class="plist" id="plist">${rows}</ul>` : '<div class="plist empty">No products in this category yet.</div>'}`;
}

function moveProduct(from, to) {
    const arr = state.data.products;
    if (to < 0 || to >= arr.length || from === to) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    changed({ rerender: true });
}

// Move one step within the filtered list (skips products hidden by the filter)
function stepProduct(index, dir) {
    const visibleIdx = state.data.products.map((p, i) => i).filter(i => state.filter === 'all' || state.data.products[i].category === state.filter);
    const pos = visibleIdx.indexOf(index);
    const target = visibleIdx[pos + dir];
    if (target === undefined) return;
    moveProduct(index, target);
    requestAnimationFrame(() => {
        const btn = document.querySelector(`.prow[data-index="${target}"] [data-action="move"][data-dir="${dir}"]`);
        btn?.focus();
    });
}

function bindDrag() {
    const list = document.getElementById('plist');
    if (!list) return;
    let from = null;
    const clear = () => list.querySelectorAll('.prow').forEach(r => r.classList.remove('is-drop-before', 'is-drop-after', 'is-dragging'));
    list.addEventListener('dragstart', (e) => {
        const row = e.target.closest('.prow');
        if (!row) return;
        from = Number(row.dataset.index);
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(from));
    });
    list.addEventListener('dragover', (e) => {
        const row = e.target.closest('.prow');
        if (!row || from === null) return;
        e.preventDefault();
        const after = e.offsetY > row.offsetHeight / 2 || e.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
        list.querySelectorAll('.prow').forEach(r => r.classList.remove('is-drop-before', 'is-drop-after'));
        row.classList.add(after ? 'is-drop-after' : 'is-drop-before');
    });
    list.addEventListener('drop', (e) => {
        const row = e.target.closest('.prow');
        if (!row || from === null) return;
        e.preventDefault();
        let to = Number(row.dataset.index);
        const after = row.classList.contains('is-drop-after');
        if (after && to < from) to += 1;
        if (!after && to > from) to -= 1;
        clear();
        const f = from;
        from = null;
        moveProduct(f, to);
    });
    list.addEventListener('dragend', () => { from = null; clear(); });
}

/* =========================================================================
   Product editor
   ========================================================================= */

function newProduct() {
    const cat = state.filter !== 'all' ? state.filter : 'app';
    return {
        id: '', name: '', category: cat, page: '',
        icon: '', banner: '',
        navDesc: '', navPill: '',
        showcaseTag: { game: 'Game', app: 'App', desktop: 'Desktop', business: 'B2B' }[cat],
        showcaseMeta: '', shippedMeta: '',
        audience: cat === 'business' ? 'b2b' : 'b2c',
        shippedCategory: { game: 'games', app: 'tools', desktop: 'desktop', business: 'saas' }[cat],
        cardTitle: '', bannerAlt: '', badges: [], description: '',
        detailsLabel: 'View Details',
        link: { type: 'play', url: '' },
        pendingLabel: '',
        show: { nav: true, showcase: true, shipped: true, grid: cat !== 'business', footer: true },
    };
}

const field = (label, bind, value, { type = 'text', placeholder = '', help = '', mono = false, attrs = '' } = {}) => `
    <label class="field">
        <span>${label}</span>
        <input class="input${mono ? ' mono' : ''}" type="${type}" data-bind="${bind}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}>
        ${help ? `<small>${help}</small>` : ''}
    </label>`;

const area = (label, bind, value, { rows = 3, help = '', placeholder = '' } = {}) => `
    <label class="field">
        <span>${label}</span>
        <textarea class="textarea" rows="${rows}" data-bind="${bind}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
        ${help ? `<small>${help}</small>` : ''}
    </label>`;

const select = (label, bind, value, options, help = '') => `
    <label class="field">
        <span>${label}</span>
        <select class="select" data-bind="${bind}">
            ${options.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
        ${help ? `<small>${help}</small>` : ''}
    </label>`;

function imageField(p, kind) {
    const path = p[kind] || '';
    const isBanner = kind === 'banner';
    const pending = state.images[path];
    return `
    <div class="img-field${isBanner ? ' is-banner' : ''}" id="img-${kind}">
        ${path ? `<img class="img-thumb" src="${esc(imgSrc(path))}" alt="">` : `<span class="img-thumb">${isBanner ? 'No banner' : 'No icon'}</span>`}
        <div class="img-controls">
            <span class="field-label">${isBanner ? 'Banner image (16:9, shown in the slideshow and on the card)' : 'App icon (square, 512×512 works well)'}</span>
            <div class="row">
                <input class="input mono" data-bind="p.${kind}" value="${esc(path)}" placeholder="assets/images/…" aria-label="${kind} path">
                <label class="btn btn-sm" style="height:36px">${I.upload} Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="${kind}" hidden></label>
                ${path && isBanner ? `<button class="btn btn-ghost btn-sm" style="height:36px" data-action="clear-image" data-kind="${kind}">Remove</button>` : ''}
            </div>
            ${pending ? `<small class="subtle">New upload, ${Math.round(pending.size / 1024)} KB. It is added to the repo when you publish.</small>` : ''}
        </div>
    </div>`;
}

function badgesEditor(p) {
    const rows = (p.badges || []).map((b, i) => `
        <div class="badge-row">
            <input class="input" data-bind="p.badges.${i}.text" value="${esc(b.text)}" placeholder="Label" aria-label="Badge ${i + 1} text">
            <select class="select" data-bind="p.badges.${i}.style" aria-label="Badge ${i + 1} colour">
                ${[['success', 'Green'], ['amber', 'Amber'], ['subtle', 'Grey']].map(([v, t]) => `<option value="${v}"${b.style === v ? ' selected' : ''}>${t}</option>`).join('')}
            </select>
            <label class="check" title="Status dot"><input type="checkbox" data-bind="p.badges.${i}.dot"${b.dot ? ' checked' : ''}> Dot</label>
            <button class="btn btn-ghost btn-icon" data-action="badge-remove" data-i="${i}" aria-label="Remove badge ${i + 1}">${I.trash}</button>
        </div>`).join('');
    return `${rows || '<p class="subtle">No badges.</p>'}
        <div><button class="btn btn-sm" data-action="badge-add">${I.plus} Add badge</button></div>`;
}

function miniCard(p) {
    const badges = (p.badges || []).filter(b => b.text).map(b => `<span class="mini-badge ${esc(b.style)}">${esc(b.text)}</span>`).join('');
    return `<div class="mini-card">
        ${p.banner ? `<img class="mini-banner" src="${esc(imgSrc(p.banner))}" alt="">` : ''}
        <div class="mini-body">
            <div class="mini-head">
                ${p.icon ? `<img src="${esc(imgSrc(p.icon))}" alt="">` : ''}
                <div><div class="mini-title">${esc(p.cardTitle || p.name || 'Untitled')}</div><div class="mini-badges">${badges}</div></div>
            </div>
            <p class="mini-desc">${esc(p.description)}</p>
        </div>
    </div>`;
}

function viewProduct() {
    const p = state.data.products[state.editingIndex];
    if (!p) { state.view = 'products'; return viewProducts(); }
    const pageOptions = [['', '— No details page (links to the store) —'], ...pages().filter(f => f !== 'index.html' && f !== 'business.html' && !f.includes('privacy') && f !== 'terms.html').map(f => [f, f])];
    if (p.page && !pageOptions.some(([v]) => v === p.page)) pageOptions.push([p.page, `${p.page} (missing)`]);
    const linkTypes = [['play', 'Google Play'], ['github', 'GitHub'], ['web', 'Website'], ['none', 'No link']];

    return `
    <div class="editor-head">
        <button class="btn btn-ghost btn-sm" data-action="nav" data-view="products">${I.back} Products</button>
        <h1 id="editor-title">${esc(p.name || 'New product')}</h1>
        <button class="btn btn-sm" data-action="duplicate">${I.copy} Duplicate</button>
        <button class="btn btn-sm btn-danger" data-action="delete">${I.trash} Delete</button>
    </div>
    <div class="editor">
        <div>
            <section class="card">
                <h2>Basics</h2>
                <div class="grid-2">
                    ${field('Name', 'p.name', p.name, { placeholder: 'e.g. Clipr', attrs: 'data-autoid' })}
                    ${select('Category', 'p.category', p.category, Object.entries(CATEGORIES), p.category === 'business' ? 'Business products appear in the menu, slideshow and shipped list, not in a card grid.' : '')}
                </div>
                <div class="grid-2">
                    ${field('ID', 'p.id', p.id, { mono: true, help: 'Used for image file names. Lowercase, dashes.' })}
                    ${select('Details page', 'p.page', p.page, pageOptions, p.page && !pages().includes(p.page) ? '<span style="color:var(--warning)">This page does not exist in the repo yet.</span>' : 'Create new pages by copying an existing product page.')}
                </div>
                ${select('Audience', 'p.audience', p.audience, [['b2c', 'Customers'], ['b2b', 'Businesses'], ['b2c b2b', 'Both']])}
            </section>

            <section class="card">
                <h2>Images</h2>
                ${imageField(p, 'icon')}
                ${imageField(p, 'banner')}
            </section>

            <section class="card">
                <div class="card-head"><h2>Section card</h2>
                    <label class="check"><input type="checkbox" data-bind="p.show.grid"${p.show?.grid !== false ? ' checked' : ''}> Show card</label></div>
                <p class="card-desc">The large card in the Games, Applications or Desktop Apps section of the homepage.</p>
                <div class="grid-2">
                    ${field('Card title', 'p.cardTitle', p.cardTitle, { placeholder: p.name })}
                    ${field('Banner alt text', 'p.bannerAlt', p.bannerAlt, { placeholder: 'Describe the banner image' })}
                </div>
                ${area('Description', 'p.description', p.description, { rows: 3 })}
                <div class="field"><span class="field-label">Badges</span><div id="badges" style="display:grid;gap:8px">${badgesEditor(p)}</div></div>
                <div class="grid-3">
                    ${select('Store button', 'p.link.type', p.link?.type || 'none', linkTypes)}
                    <div style="grid-column: span 2">${p.link?.type && p.link.type !== 'none'
                        ? field('Store / repo URL', 'p.link.url', p.link?.url, { type: 'url', placeholder: 'https://', mono: true })
                        : field('Label instead of a button', 'p.pendingLabel', p.pendingLabel, { placeholder: 'e.g. Under Development' })}</div>
                </div>
                ${field('Details button text', 'p.detailsLabel', p.detailsLabel, { placeholder: 'View Details' })}
            </section>

            <section class="card">
                <div class="card-head"><h2>Menu</h2>
                    <label class="check"><input type="checkbox" data-bind="p.show.nav"${p.show?.nav !== false ? ' checked' : ''}> Show in menu</label></div>
                <p class="card-desc">The Games / Apps dropdowns in the top navigation on every page.</p>
                <div class="grid-2">
                    ${field('Short description', 'p.navDesc', p.navDesc, { placeholder: 'Quick video editing tools' })}
                    ${field('Pill', 'p.navPill', p.navPill, { placeholder: 'e.g. Soon, New, B2B', help: 'Optional small label next to the name.' })}
                </div>
            </section>

            <section class="card">
                <div class="card-head"><h2>Hero slideshow</h2>
                    <label class="check"><input type="checkbox" data-bind="p.show.showcase"${p.show?.showcase !== false ? ' checked' : ''}> Show slide</label></div>
                <p class="card-desc">Needs a banner image. Shown in the carousel at the top of the homepage.</p>
                <div class="grid-2">
                    ${field('Tag', 'p.showcaseTag', p.showcaseTag, { placeholder: 'App' })}
                    ${field('Caption', 'p.showcaseMeta', p.showcaseMeta, { placeholder: 'Quick video editing · Jetpack Compose' })}
                </div>
            </section>

            <section class="card">
                <div class="card-head"><h2>“Shipped by us” list</h2>
                    <label class="check"><input type="checkbox" data-bind="p.show.shipped"${p.show?.shipped !== false ? ' checked' : ''}> Show in list</label></div>
                <div class="grid-2">
                    ${field('Tech / platform line', 'p.shippedMeta', p.shippedMeta, { placeholder: 'Jetpack Compose' })}
                    ${select('Group', 'p.shippedCategory', p.shippedCategory, [['games', 'Games'], ['tools', 'Tools'], ['desktop', 'Desktop'], ['saas', 'SaaS']])}
                </div>
            </section>

            <section class="card">
                <div class="card-head"><h2>Footer</h2>
                    <label class="check"><input type="checkbox" data-bind="p.show.footer"${p.show?.footer !== false ? ' checked' : ''}> Link in footer</label></div>
            </section>
        </div>

        <aside class="side-sticky">
            <section class="card">
                <h2>Card preview</h2>
                <div id="mini-preview">${miniCard(p)}</div>
            </section>
        </aside>
    </div>`;
}

function updateProductLive(p, path) {
    const title = document.getElementById('editor-title');
    if (title) title.textContent = p.name || 'New product';
    const mini = document.getElementById('mini-preview');
    if (mini) mini.innerHTML = miniCard(p);
    if (path === 'p.icon' || path === 'p.banner') {
        const kind = path.slice(2);
        const el = document.getElementById(`img-${kind}`);
        const thumb = el?.querySelector('.img-thumb');
        if (thumb && thumb.tagName === 'IMG' && p[kind]) thumb.src = imgSrc(p[kind]);
    }
}

async function handleUpload(input) {
    const file = input.files?.[0];
    if (!file) return;
    const kind = input.dataset.upload;
    const p = state.data.products[state.editingIndex];
    if (!file.type.startsWith('image/')) return toast('That file is not an image.', true);
    if (file.size > MAX_IMAGE_BYTES) return toast(`Image is ${(file.size / 1048576).toFixed(1)} MB. Keep it under 1.5 MB so pages load fast.`, true);
    const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
    const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[file.type] || 'png';
    const slug = p.id || slugify(p.name) || 'product';
    let path = `assets/images/${slug}-${kind}.${ext}`;
    // Never overwrite a published file in place: browsers and the CDN would keep the old one cached
    if (state.paths.includes(path) || state.images[path]) path = `assets/images/${slug}-${kind}-${Date.now().toString(36)}.${ext}`;
    state.images[path] = { base64: dataUrl.split(',')[1], dataUrl, size: file.size };
    p[kind] = path;
    changed({ rerender: true });
}

/* =========================================================================
   Homepage text
   ========================================================================= */

function viewText() {
    const d = state.data;
    const s = d.sections || {};
    const section = (key, name, where, { eyebrow = true } = {}) => `
        <section class="card">
            <h2>${name}</h2>
            <p class="card-desc">${where}</p>
            ${eyebrow ? `<div class="grid-2">${field('Eyebrow', `d.sections.${key}.eyebrow`, s[key]?.eyebrow)}${field('Heading', `d.sections.${key}.title`, s[key]?.title)}</div>`
            : field('Heading', `d.sections.${key}.title`, s[key]?.title)}
            ${area(key === 'support' ? 'Intro' : 'Subtitle', `d.sections.${key}.subtitle`, s[key]?.subtitle, { rows: 2 })}
        </section>`;
    return `
    <div class="page-head"><div><h1>Homepage text</h1><p>Headings and intro copy on the homepage.</p></div></div>
    <section class="card">
        <h2>Hero</h2>
        <p class="card-desc">The first thing visitors read, above the slideshow.</p>
        ${field('Eyebrow', 'd.hero.eyebrow', d.hero?.eyebrow)}
        ${area('Headline', 'd.hero.title', d.hero?.title, { rows: 2 })}
        ${area('Lead', 'd.hero.lead', d.hero?.lead, { rows: 2 })}
    </section>
    ${section('business', 'Business section', 'The B2B block with the Realigator flagship.', { eyebrow: false })}
    ${section('games', 'Games section', 'Above the game cards.')}
    ${section('apps', 'Applications section', 'Above the mobile app cards.')}
    ${section('desktop', 'Desktop apps section', 'Above the desktop app cards.')}
    ${section('about', 'How we build', 'The philosophy section.')}
    ${section('support', 'Support & inquiries', 'The contact block near the bottom.')}`;
}

/* =========================================================================
   Settings
   ========================================================================= */

function viewSettings() {
    const space = state.data.settings?.defaultSpace === 'business' ? 'business' : 'customers';
    const local = state.backend.kind === 'local';
    const option = (value, title, desc, page) => `
        <label class="space-option">
            <input type="radio" name="defaultSpace" data-bind="d.settings.defaultSpace" value="${value}"${space === value ? ' checked' : ''}>
            <span class="space-check" aria-hidden="true"></span>
            <strong>${title}</strong>
            <small>${desc}</small>
            <span class="mono">${page}</span>
        </label>`;
    return `
    <div class="page-head"><div><h1>Settings</h1></div></div>
    <section class="card">
        <h2>Default space</h2>
        <p class="card-desc">Which version of the site people see when they open silverbytestudio.com from outside (search, a shared link, typing the address). The “For Business” / “For Customers” switch in the menu keeps working either way.</p>
        <div class="space-options" role="radiogroup" aria-label="Default space">
            ${option('customers', 'For Customers', 'Apps and games first. The consumer homepage.', 'index.html')}
            ${option('business', 'For Business', 'Custom software and B2B work first. Visitors are sent to the business page.', 'business.html')}
        </div>
    </section>
    <section class="card">
        <h2>Backup</h2>
        <p class="card-desc">Download all content as JSON, or load a JSON file you exported before. Loading replaces your current edits; nothing is published until you press Publish.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm" data-action="export">Download site.json</button>
            <label class="btn btn-sm">Load from file<input type="file" accept="application/json,.json" data-import hidden></label>
        </div>
    </section>
    <section class="card">
        <h2>Connection</h2>
        ${local ? '<p class="muted">Local mode. Reading files from this computer; publishing is off. Export site.json, put it in content/, run <span class="mono">node scripts/build.mjs</span>, then commit.</p>'
            : `<p class="muted">Connected to <span class="mono">${esc(repoKey())}</span>. Your PIN unlocks a GitHub token stored encrypted in this browser only.</p>`}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm" data-action="reload">Reload from ${local ? 'disk' : 'GitHub'}</button>
            ${local ? '' : '<button class="btn btn-sm" data-action="change-pin">Change PIN</button> <button class="btn btn-sm" data-action="forget-device">Forget this device</button>'}
            <button class="btn btn-sm btn-danger" data-action="signout">Sign out</button>
        </div>
    </section>`;
}

/* =========================================================================
   Preview
   ========================================================================= */

function viewPreview() {
    return `
    <div class="page-head">
        <div><h1>Preview</h1><p>How the pages look with your current edits, before publishing.</p></div>
        <div class="toolbar" style="margin:0">
            <button class="chip" data-action="preview-page" data-page="index.html" aria-pressed="${state.previewPage === 'index.html'}">Homepage</button>
            <button class="chip" data-action="preview-page" data-page="business.html" aria-pressed="${state.previewPage === 'business.html'}">Business page</button>
            <button class="chip" data-action="preview-mobile" aria-pressed="${state.previewMobile}">Phone width</button>
        </div>
    </div>
    <div class="preview-frame-wrap${state.previewMobile ? ' is-mobile' : ''}"><iframe class="preview-frame" id="preview-frame" title="Site preview"></iframe></div>`;
}

function mountPreview() {
    const frame = document.getElementById('preview-frame');
    const src = state.texts[state.previewPage];
    if (!frame) return;
    if (!src) { frame.srcdoc = '<p style="font:14px sans-serif;color:#aaa;padding:20px">Page not found.</p>'; return; }
    // Never redirect inside the preview
    const data = { ...state.data, settings: { ...state.data.settings, defaultSpace: 'customers' } };
    let html = renderPage(src, data, state.previewPage);
    for (const [path, img] of Object.entries(state.images)) html = html.split(path).join(img.dataUrl);
    const baseHref = new URL('../', location.href).href;
    html = html.replace(/<head>/i, `<head><base href="${baseHref}">`);
    frame.srcdoc = html;
}

/* =========================================================================
   Publish
   ========================================================================= */

function computeChanges() {
    const files = [];
    const json = serialize(state.data);
    if (json !== state.texts[DATA_PATH]) files.push({ path: DATA_PATH, text: json, kind: 'content' });
    for (const path of pages()) {
        const before = state.texts[path];
        if (before == null) continue;
        const after = renderPage(before, state.data, path);
        if (after !== before) files.push({ path, text: after, kind: 'page' });
    }
    const used = new Set(state.data.products.flatMap(p => [p.icon, p.banner]));
    for (const [path, img] of Object.entries(state.images)) {
        if (used.has(path)) files.push({ path, base64: img.base64, kind: `image · ${Math.round(img.size / 1024)} KB` });
    }
    return files;
}

function openDialog(html) {
    dialog.innerHTML = html;
    if (!dialog.open) dialog.showModal();
}
function closeDialog() { if (dialog.open) dialog.close(); }

function publishDialog() {
    const problems = validate(state.data);
    const warnings = missingPages(state.data, pages());
    const local = state.backend.kind === 'local';

    if (problems.length) {
        return openDialog(`<div class="dialog-body"><h2>Fix these before publishing</h2>
            <ul class="problem-list">${problems.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
            <div class="dialog-actions"><button class="btn" data-action="close-dialog">OK</button></div>`);
    }

    if (local) {
        return openDialog(`<div class="dialog-body"><h2>Export content</h2>
            <p class="muted">Local mode can't publish. Download site.json, replace <span class="mono">content/site.json</span> with it, then run:</p>
            <pre class="mono" style="background:var(--bg-sunken);padding:10px;border-radius:6px;margin:0">node scripts/build.mjs</pre>
            ${Object.keys(state.images).length ? '<p style="color:var(--warning)">Uploaded images aren\'t included in the export. Copy them into assets/images yourself, or sign in with GitHub to publish them.</p>' : ''}
            </div>
            <div class="dialog-actions"><button class="btn btn-ghost" data-action="close-dialog">Cancel</button><button class="btn btn-primary" data-action="export">Download site.json</button></div>`);
    }

    const files = computeChanges();
    if (!files.length) {
        return openDialog(`<div class="dialog-body"><h2>Nothing to publish</h2><p class="muted">Your edits produce the same pages that are already live.</p></div>
            <div class="dialog-actions"><button class="btn" data-action="close-dialog">OK</button></div>`);
    }
    const summary = summarize();
    openDialog(`<form method="dialog" id="publish-form">
        <div class="dialog-body">
            <h2>Publish to the live site</h2>
            <p class="muted">This commits ${files.length} file${files.length === 1 ? '' : 's'} to <span class="mono">${esc(repoKey())}</span>. The site updates in about a minute.</p>
            <ul class="file-list">${files.map(f => `<li><span>${esc(f.path)}</span><span class="kind">${esc(f.kind)}</span></li>`).join('')}</ul>
            ${warnings.length ? `<ul class="warn-list">${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
            <label class="field"><span>Change note</span><input class="input" name="message" value="${esc(summary)}" maxlength="120"></label>
            <p class="error-text" id="publish-error" role="alert" hidden></p>
        </div>
        <div class="dialog-actions">
            <button class="btn btn-ghost" type="button" data-action="close-dialog">Cancel</button>
            <button class="btn btn-primary" type="submit" id="publish-confirm">Publish</button>
        </div>
    </form>`);
    document.getElementById('publish-form').addEventListener('submit', (e) => {
        e.preventDefault();
        doPublish(files, e.target.message.value.trim() || summary);
    });
}

function summarize() {
    const before = JSON.parse(state.savedJson);
    const now = state.data;
    const names = (d) => new Map(d.products.map(p => [p.id, p]));
    const b = names(before), a = names(now);
    const added = [...a.keys()].filter(k => !b.has(k)).map(k => a.get(k).name);
    const removed = [...b.keys()].filter(k => !a.has(k)).map(k => b.get(k).name);
    const edited = [...a.keys()].filter(k => b.has(k) && JSON.stringify(a.get(k)) !== JSON.stringify(b.get(k))).map(k => a.get(k).name);
    const parts = [];
    if (added.length) parts.push(`add ${added.join(', ')}`);
    if (removed.length) parts.push(`remove ${removed.join(', ')}`);
    if (edited.length) parts.push(`update ${edited.slice(0, 3).join(', ')}${edited.length > 3 ? '…' : ''}`);
    if (before.products.map(p => p.id).join() !== now.products.map(p => p.id).join() && !added.length && !removed.length) parts.push('reorder products');
    if (JSON.stringify(before.hero) !== JSON.stringify(now.hero) || JSON.stringify(before.sections) !== JSON.stringify(now.sections)) parts.push('edit homepage text');
    if (before.settings?.defaultSpace !== now.settings?.defaultSpace) parts.push(`default space: ${now.settings.defaultSpace}`);
    const msg = parts.join('; ') || 'update site content';
    return 'Admin: ' + msg.charAt(0).toLowerCase() + msg.slice(1);
}

async function doPublish(files, message) {
    const btn = document.getElementById('publish-confirm');
    const errEl = document.getElementById('publish-error');
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    try {
        const commit = await state.backend.commit(state.base, files, message + '\n\nPublished from the Silverbyte admin panel.');
        state.images = {};
        storage.del(KEY_DRAFT);
        state.draft = null;
        await loadSnapshot();
        state.lastPublish = { url: commit.html_url, at: Date.now() };
        closeDialog();
        renderView();
        toast('Published. The live site updates in about a minute.');
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Publish';
        errEl.hidden = false;
        if (err.status === 422 || err.status === 409) {
            errEl.innerHTML = 'The site changed on GitHub since you loaded it. <button class="btn btn-sm" type="button" data-action="rebase">Reload latest and keep my edits</button>';
        } else if (err.status === 401 || err.status === 403) {
            errEl.textContent = 'GitHub refused the change. Your token may have expired or lack "Contents: Read and write".';
        } else {
            errEl.textContent = `Publishing failed: ${err.message}`;
        }
    }
}

/* =========================================================================
   Events
   ========================================================================= */

function confirmDialog(title, body, confirmLabel, onConfirm, danger = false) {
    openDialog(`<div class="dialog-body"><h2>${title}</h2><p class="muted">${body}</p></div>
        <div class="dialog-actions"><button class="btn btn-ghost" data-action="close-dialog">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-btn">${confirmLabel}</button></div>`);
    document.getElementById('confirm-btn').addEventListener('click', () => { closeDialog(); onConfirm(); }, { once: true });
}

function exportJson() {
    const blob = new Blob([serialize(state.data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function signOut() {
    const go = () => { storage.del(KEY_AUTH); state.data = null; state.images = {}; renderSignIn(); };
    if (state.data && isDirty()) {
        confirmDialog('Sign out?', 'Your unpublished edits stay saved in this browser (uploaded images are lost) and you can restore them after unlocking again.', 'Sign out', go);
    } else go();
}

const actions = {
    local: () => start(new LocalBackend()),
    setup: () => renderSetup(),
    lock: () => renderLock(),
    'change-pin': changePinDialog,
    'forget-device': forgetDeviceDialog,
    retry: () => start(state.backend),
    signout: signOut,
    nav: (el) => { state.view = el.dataset.view; renderView(); window.scrollTo(0, 0); },
    filter: (el) => { state.filter = el.dataset.filter; renderView(); },
    edit: (el) => { state.editingIndex = Number(el.dataset.index); state.view = 'product'; renderView(); window.scrollTo(0, 0); },
    move: (el) => stepProduct(Number(el.dataset.index), Number(el.dataset.dir)),
    add: () => {
        state.data.products.push(newProduct());
        state.editingIndex = state.data.products.length - 1;
        state.view = 'product';
        changed({ rerender: true });
        document.querySelector('[data-bind="p.name"]')?.focus();
    },
    duplicate: () => {
        const p = clone(state.data.products[state.editingIndex]);
        p.name = `${p.name} copy`;
        p.id = slugify(p.name);
        state.data.products.splice(state.editingIndex + 1, 0, p);
        state.editingIndex += 1;
        changed({ rerender: true });
        toast('Duplicated. You are now editing the copy.');
    },
    delete: () => {
        const p = state.data.products[state.editingIndex];
        confirmDialog(`Delete ${esc(p.name || 'this product')}?`,
            'It is removed from the menu, homepage and footer when you publish. Its details page and images stay in the repo.',
            'Delete', () => {
                state.data.products.splice(state.editingIndex, 1);
                state.view = 'products';
                changed({ rerender: true });
                toast('Product removed. Publish to update the site.');
            }, true);
    },
    'badge-add': () => {
        const p = state.data.products[state.editingIndex];
        (p.badges ||= []).push({ text: '', style: 'subtle', dot: false });
        document.getElementById('badges').innerHTML = badgesEditor(p);
        document.querySelector(`[data-bind="p.badges.${p.badges.length - 1}.text"]`)?.focus();
        changed();
    },
    'badge-remove': (el) => {
        const p = state.data.products[state.editingIndex];
        p.badges.splice(Number(el.dataset.i), 1);
        document.getElementById('badges').innerHTML = badgesEditor(p);
        updateProductLive(p);
        changed();
    },
    'clear-image': (el) => {
        const p = state.data.products[state.editingIndex];
        p[el.dataset.kind] = '';
        changed({ rerender: true });
    },
    'preview-page': (el) => { state.previewPage = el.dataset.page; renderView(); },
    'preview-mobile': () => { state.previewMobile = !state.previewMobile; renderView(); },
    publish: publishDialog,
    'close-dialog': closeDialog,
    export: () => { exportJson(); closeDialog(); },
    reload: () => {
        const go = async () => { state.images = {}; await loadSnapshot(); changed({ rerender: true }); toast('Reloaded.'); };
        if (isDirty()) confirmDialog('Reload and discard edits?', 'Your unpublished changes will be lost.', 'Discard and reload', go, true);
        else go();
    },
    rebase: async () => {
        try {
            await loadSnapshot({ keepData: true });
            closeDialog();
            changed({ rerender: true });
            publishDialog();
        } catch (err) { toast(`Reload failed: ${err.message}`, true); }
    },
    'draft-restore': () => { state.data = state.draft.data; state.draft = null; changed({ rerender: true }); toast('Draft restored.'); },
    'draft-discard': () => { state.draft = null; storage.del(KEY_DRAFT); renderView(); },
    'dismiss-publish': () => { state.lastPublish = null; renderView(); },
};

document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el);
});

dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });

function onBind(el) {
    const path = el.dataset.bind;
    const [root, ...rest] = path.split('.');
    const target = root === 'p' ? state.data.products[state.editingIndex] : state.data;
    if (!target) return;
    const key = rest.join('.');
    const value = el.type === 'checkbox' ? el.checked : el.value;

    if (root === 'p' && key === 'name') {
        const p = target;
        // Keep the id in step with the name until someone edits the id by hand
        if (!p.id || p.id === slugify(p.name)) {
            p.id = slugify(value);
            const idInput = document.querySelector('[data-bind="p.id"]');
            if (idInput) idInput.value = p.id;
        }
    }
    if (root === 'p' && key === 'id') {
        setPath(target, key, slugify(value) === value ? value : value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    } else {
        setPath(target, key, value);
    }
    if (root === 'p') updateProductLive(target, path);
    changed();
}

document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-bind]');
    if (el && el.tagName !== 'SELECT' && el.type !== 'checkbox' && el.type !== 'radio') onBind(el);
});
document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('[data-upload]')) return handleUpload(el);
    if (el.matches('[data-import]')) return importJson(el);
    if (!el.matches('[data-bind]')) return;
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') {
        onBind(el);
        // Structural fields change which inputs are shown
        if (/^p\.(category|link\.type|page)$/.test(el.dataset.bind)) renderView();
    }
});

async function importJson(input) {
    const file = input.files?.[0];
    if (!file) return;
    try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.products)) throw new Error('No products list in this file.');
        state.data = data;
        changed({ rerender: true });
        toast('Loaded. Review and publish when ready.');
    } catch (err) {
        toast(`Could not load that file: ${err.message}`, true);
    }
}

/* =========================================================================
   Boot
   ========================================================================= */

// Older versions could keep the plain token in localStorage; the unlocked token now lives in this tab only.
try { localStorage.removeItem(KEY_AUTH); } catch { /* ignore */ }
const saved = storage.get(KEY_AUTH);
if (saved?.token) start(new GitHubBackend(saved.repo || DEFAULT_REPO, saved.token));
else if (new URLSearchParams(location.search).has('local') && isLocalHost()) start(new LocalBackend());
else renderSignIn();
