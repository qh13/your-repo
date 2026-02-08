/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 使用完全静态导出以兼容 Cloudflare Pages
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
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
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  // Aggressive webpack optimization for Cloudflare Pages 25MiB limit
  webpack: (config, { isServer }) => {
    // Client-side optimization
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        // Use deterministic module ids for better caching
        moduleIds: 'deterministic',
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
