import { NextResponse } from 'next/server';
import { renderPortfolioHtml } from '@/lib/portfolio';

export const dynamic = 'force-dynamic';

const ALLOWED_SLUGS = new Set([
  'index',
  'business',
  'audiox',
  'bariwala',
  'clipr',
  'fallinko',
  'gif-maker',
  'linko',
  'loaney',
  'prompter',
  'realigator',
  'triple-tiles',
  'video-downloader',
  'privacy-policy',
  'terms',
  'clipr-privacy-policy',
  'gif-maker-privacy-policy',
  'linko-privacy-policy',
  'loaney-privacy-policy',
]);

export async function GET(request, { params }) {
  const { slug } = await params;
  const cleanSlug = String(slug || 'index').replace(/\.html$/i, '');

  if (!ALLOWED_SLUGS.has(cleanSlug)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const html = await renderPortfolioHtml(`${cleanSlug}.html`);
  if (!html) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
