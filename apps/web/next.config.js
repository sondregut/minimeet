/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@minimeet/ui', '@minimeet/database', '@minimeet/types'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
