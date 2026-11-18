/** @type {import('next').NextConfig} */
const PORTFOLIO_HTML_PAGES = [
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
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        { source: '/portfolio-admin', destination: '/portfolio-admin/index.html' },
        ...PORTFOLIO_HTML_PAGES.map((slug) => ({
          source: `/${slug}`,
          destination: `/${slug}.html`,
        })),
      ],
    };
  },
};

export default nextConfig;
