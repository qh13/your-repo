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
  // Optimize webpack for Cloudflare Pages 25MiB limit
  webpack: (config, { isServer }) => {
    // Client-side optimization - aggressive chunking
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 50,
          minSize: 10000,
          cacheGroups: {
            // Separate hls.js
            hlsjs: {
              test: /[\\/]node_modules[\\/]hls\.js[\\/]/,
              name: 'hlsjs',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Separate React
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Core vendor with higher priority
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    // Server-side optimization
    if (isServer) {
      config.devtool = false;
      config.output = {
        ...config.output,
        pathinfo: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
