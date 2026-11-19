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
  async redirects() {
    return [
      ...['/admin/index.html', '/portfolio-admin/index.html'].map((source) => ({
        source,
        destination: '/admin/portfolio',
        permanent: false,
      })),
      {
        source: '/portfolio-admin',
        destination: '/admin/portfolio',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/api/portfolio/render/index' },
        { source: '/index.html', destination: '/api/portfolio/render/index' },
        ...PORTFOLIO_HTML_PAGES.flatMap((slug) => [
          { source: `/${slug}`, destination: `/api/portfolio/render/${slug}` },
          { source: `/${slug}.html`, destination: `/api/portfolio/render/${slug}` },
        ]),
      ],
    };
  },
};

export default nextConfig;
