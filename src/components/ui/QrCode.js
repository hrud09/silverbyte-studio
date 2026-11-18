import React from 'react';
import { encodeQr } from '@/lib/qrcode';

/**
 * Render a QR code as inline SVG.
 *
 * The matrix is computed from `value` with no network round-trip, which is the point:
 * a Quick Share link is a credential, and asking a third-party image service to draw it
 * would publish it. Works unchanged in a server or client component.
 *
 * Drawn as one <path> of module-sized squares rather than hundreds of <rect> elements —
 * same picture, a fraction of the DOM.
 */
export default function QrCode({
  value,
  size = 200,
  margin = 4,
  dark = '#111111',
  light = '#FFFFFF',
  ecLevel = 'M',
  title = 'QR code',
  className = '',
  style,
}) {
  if (!value) return null;

  let matrix;
  try {
    matrix = encodeQr(value, { ecLevel });
  } catch (err) {
    console.error('[QrCode] Could not encode value:', err.message);
    return null;
  }

  const { size: count, modules } = matrix;
  const extent = count + margin * 2;

  let path = '';
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (modules[y][x]) path += `M${x + margin} ${y + margin}h1v1h-1z`;
    }
  }

  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox={`0 0 ${extent} ${extent}`}
      role="img"
      aria-label={title}
      shapeRendering="crispEdges"
    >
      <title>{title}</title>
      <rect width={extent} height={extent} fill={light} />
      <path d={path} fill={dark} />
    </svg>
  );
}
