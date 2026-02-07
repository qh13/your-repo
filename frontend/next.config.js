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
  // Experimental optimizations for Cloudflare Pages
  experimental: {
    // Optimize server bundle size
    serverMinification: true,
    optimizeCss: true,
  },
  // Optimize webpack for Cloudflare Pages 25MiB limit
  webpack: (config, { isServer }) => {
    // Client-side optimization
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            hlsjs: {
              test: /[\\/]node_modules[\\/]hls\.js[\\/]/,
              name: 'hlsjs',
              priority: 20,
              reuseExistingChunk: true,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 10,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Server-side optimization - reduce server bundle size
    if (isServer) {
      // Disable source maps to reduce bundle size
      config.devtool = false;

      // Optimize server output
      config.output = {
        ...config.output,
        pathinfo: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;