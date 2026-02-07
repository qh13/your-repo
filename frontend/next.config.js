/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.jable.tv',
      },
      {
        protocol: 'https',
        hostname: '**/*.jable.tv',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  // Reduce webpack cache size for Cloudflare Pages (max 25 MiB per file)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.cache = {
        type: 'memory',
        maxMemoryGenerations: 1,
      };
    }
    return config;
  },
};

module.exports = nextConfig;