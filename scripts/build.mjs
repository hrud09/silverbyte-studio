#!/usr/bin/env node
/**
 * Re-render every page's <!-- cms:... --> regions from content/site.json.
 *
 *   node scripts/build.mjs          write changes
 *   node scripts/build.mjs --check  exit 1 if any page is out of date
 *
 * The admin panel (/admin) does the same thing in the browser before committing,
 * so you only need this after editing content/site.json by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, validate } from '../assets/js/cms-render.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const data = JSON.parse(fs.readFileSync(path.join(root, 'content/site.json'), 'utf8'));

const problems = validate(data);
if (problems.length) {
    console.error('content/site.json has problems:\n- ' + problems.join('\n- '));
    process.exit(1);
}

let stale = 0;
for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
    const full = path.join(root, file);
    const before = fs.readFileSync(full, 'utf8');
    const after = renderPage(before, data, file);
    if (after === before) continue;
    stale++;
    if (check) console.log('out of date:', file);
    else { fs.writeFileSync(full, after); console.log('updated:', file); }
}
if (!stale) console.log('All pages up to date.');
if (check && stale) process.exit(1);
