'use client';

import React from 'react';

export default function AppIconImg({ src, alt, className, fallbackSrc }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        e.currentTarget.src = fallbackSrc;
      }}
    />
  );
}
