import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    ['#D32F2F', '#9A0007'], // Red Apps primary
    ['#1976D2', '#004BA0'], // Blue
    ['#388E3C', '#00600F'], // Green
    ['#7B1FA2', '#4A0072'], // Purple
    ['#F57C00', '#BB4D00'], // Orange
    ['#00796B', '#004D40'], // Teal
    ['#C2185B', '#8C0032'], // Pink
    ['#303F9F', '#001970'], // Indigo
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function getInitials(slug) {
  if (!slug) return 'RA';
  const parts = slug.replace(/^sb-/, '').split('-');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return slug.substring(0, 2).toUpperCase();
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const rawParams = resolvedParams?.params || [];
  
  // URL styles supported:
  // /api/placeholder/icon/sb-file-manager
  // /api/placeholder/feature/sb-file-manager
  // /api/placeholder/screenshot/sb-file-manager/1
  const type = rawParams[0] || 'icon';
  const slug = rawParams[1] || 'red-app';
  const index = rawParams[2] || '1';

  const [color1, color2] = stringToColor(slug);
  const initials = getInitials(slug);

  let svg = '';

  if (type === 'icon') {
    svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
        <filter id="drop" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="rgba(0,0,0,0.25)"/>
        </filter>
      </defs>
      <rect width="512" height="512" rx="110" fill="url(#grad)" filter="url(#drop)"/>
      <circle cx="256" cy="256" r="140" fill="rgba(255,255,255,0.12)"/>
      <text x="256" y="285" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif" font-size="120" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="-3">${initials}</text>
      <text x="256" y="440" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif" font-size="28" font-weight="600" fill="rgba(255,255,255,0.85)" text-anchor="middle">SILVER BYTE</text>
    </svg>`;
  } else if (type === 'feature') {
    svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
      <defs>
        <linearGradient id="fgrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="60%" style="stop-color:${color2};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0D0D1A;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.18" />
          <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0.0" />
        </linearGradient>
        <radialGradient id="glow" cx="75%" cy="35%" r="65%">
          <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.25" />
          <stop offset="50%" style="stop-color:${color1};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:0" />
        </radialGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
        </pattern>
      </defs>
      
      <!-- Base Background -->
      <rect width="1024" height="500" fill="url(#fgrad)"/>
      <rect width="1024" height="500" fill="url(#grid)"/>
      
      <!-- Ambient Glow & Lighting Streaks -->
      <circle cx="780" cy="180" r="320" fill="url(#glow)"/>
      
      <!-- Abstract Floating Geometry & Shapes -->
      <path d="M 600 -50 L 1100 150 L 950 550 L 450 350 Z" fill="url(#accentGrad)"/>
      <circle cx="850" cy="140" r="180" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
      <circle cx="920" cy="360" r="100" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
      <circle cx="480" cy="420" r="220" fill="rgba(0,0,0,0.25)"/>

      <!-- Polished Monogram Watermark on Right Wing -->
      <g opacity="0.12" transform="translate(680, 100)">
        <rect width="240" height="240" rx="55" fill="#FFFFFF"/>
        <text x="120" y="160" font-family="-apple-system, BlinkMacSystemFont, Roboto, Inter, sans-serif" font-size="110" font-weight="900" fill="${color2}" text-anchor="middle">${initials}</text>
      </g>
    </svg>`;
  } else {
    // Honest "no screenshot yet" placeholder — a phone-shaped frame with a plain
    // notice, not a fabricated mockup of app content the developer never provided.
    svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="700" viewBox="0 0 400 700">
      <defs>
        <linearGradient id="sgrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#212121;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#121212;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Phone Frame Outer -->
      <rect width="400" height="700" rx="36" fill="#0A0A0A"/>
      <rect x="8" y="8" width="384" height="684" rx="30" fill="url(#sgrad)" stroke="#333333" stroke-width="2"/>

      <!-- Camera punch hole -->
      <circle cx="200" cy="30" r="8" fill="#000000"/>

      <!-- Status bar -->
      <text x="40" y="34" font-family="sans-serif" font-size="12" font-weight="600" fill="#AAAAAA">9:41</text>
      <text x="360" y="34" font-family="sans-serif" font-size="12" font-weight="600" fill="#AAAAAA" text-anchor="end">100%</text>

      <!-- Honest empty-state notice -->
      <circle cx="200" cy="330" r="48" fill="rgba(255,255,255,0.06)"/>
      <path d="M 178 320 L 222 320 L 222 348 L 178 348 Z" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
      <circle cx="200" cy="334" r="7" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
      <text x="200" y="410" font-family="-apple-system, BlinkMacSystemFont, Roboto, Inter, sans-serif" font-size="16" font-weight="600" fill="rgba(255,255,255,0.55)" text-anchor="middle">No screenshot yet</text>

      <!-- Home bar indicator -->
      <rect x="140" y="675" width="120" height="4" rx="2" fill="#FFFFFF" opacity="0.6"/>
    </svg>`;
  }

  return new NextResponse(svg.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
