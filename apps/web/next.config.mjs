// Strip trailing /api if present so rewrites don't double it
const _rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const API_URL = _rawApiUrl.replace(/\/api$/, '');

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
