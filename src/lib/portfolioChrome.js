import { renderPortfolioHtml } from '@/lib/portfolio';

/**
 * Shared site chrome for the App Store.
 *
 * The store renders the portfolio's own header and footer (taken from the live,
 * CMS-rendered portfolio template) so both sites always show the same top bar,
 * menus, product lists and footer links. Edit the portfolio, and the store follows.
 */

const TEMPLATE = 'terms.html';

const STORE_FOOTER_LINKS = [
  '<li><a href="/privacy">Store Privacy</a></li>',
  '<li><a href="/store-terms">Store Terms</a></li>',
].join('');

function extract(html, startPattern, endTag) {
  const start = html.search(startPattern);
  if (start === -1) return '';
  const end = html.indexOf(endTag, start);
  if (end === -1) return '';
  return html.slice(start, end + endTag.length);
}

/** Portfolio pages use relative URLs ("linko", "assets/..."); the store lives under other paths. */
function absolutize(fragment) {
  return fragment.replace(/\b(href|src)="(?!https?:|mailto:|tel:|\/|#|data:)([^"]*)"/g, '$1="/$2"');
}

function markStoreAsCurrent(header) {
  return header
    .replace(/\s+aria-current="page"/g, '')
    .replace(/class="nav-trigger is-current"/g, 'class="nav-trigger"')
    .replace(
      /<a href="\/appstore" class="nav-cta nav-cta--store"/,
      '<a href="/appstore" class="nav-cta nav-cta--store" aria-current="page"'
    );
}

export async function getPortfolioChrome() {
  try {
    const html = await renderPortfolioHtml(TEMPLATE);
    if (!html) return { header: '', footer: '' };

    const header = markStoreAsCurrent(absolutize(extract(html, /<header class="site-header"/, '</header>')));
    const footer = absolutize(extract(html, /<footer class="site-footer"/, '</footer>'))
      .replace(/<span id="current-year">\d+<\/span>/, `<span id="current-year">${new Date().getFullYear()}</span>`)
      // Store-only legal pages join the shared footer link list.
      .replace(
        /(<ul class="footer-links">[\s\S]*?)(\s*<\/ul>)/,
        `$1${STORE_FOOTER_LINKS}$2`
      );
    return { header, footer };
  } catch (err) {
    console.error('Failed to load portfolio chrome for the store:', err);
    return { header: '', footer: '' };
  }
}
