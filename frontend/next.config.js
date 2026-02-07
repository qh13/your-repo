/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,  // Cloudflare Pages 需要禁用图片优化
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
  // Aggressive webpack optimization for Cloudflare Pages 25MiB limit
  webpack: (config, { isServer }) => {
    // Client-side optimization
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        // Use deterministic module ids for better caching
        moduleIds: 'deterministic',
        // Enable tree shaking
        usedExports: true,
        // Split chunks aggressively
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 50,
          minSize: 20000,
          cacheGroups: {
            // Separate hls.js into its own chunk
            hlsjs: {
              test: /[\\/]node_modules[\\/]hls\.js[\\/]/,
              name: 'hlsjs',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Separate React core
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Vendor chunks with priority
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
        // Minimize runtime chunk
        runtimeChunk: 'single',
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
