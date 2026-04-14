// Strip trailing /api if present so rewrites don't double it
const _rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const API_URL = _rawApiUrl.replace(/\/api$/, '');

// Extract API origin to include in CSP connect-src (handles any Vercel subdomain)
const apiOrigin = (() => {
  try { return new URL(API_URL).origin; } catch { return API_URL; }
})();

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'DENY' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://*.supabase.co blob:",
      // Allow same-origin + the API domain + Supabase
      `connect-src 'self' ${apiOrigin} https://*.supabase.co wss://*.supabase.co`,
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  transpilePackages: ['@casageri/shared-types'],
  async headers() {
    return [
      {
        // Apply to pages only — exclude Next.js static assets, images and icons
        source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default config;
