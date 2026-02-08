/**
 * API 配置
 */

// Worker 代理地址 - 优先使用环境变量，否则使用部署的 worker
export const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://jable-video-proxy.qh13.workers.dev';

// Workers.dev 域名直接提供视频详情页面
export const VIDEO_PAGE_URL = 'https://jable-video-proxy.qh13.workers.dev';

export const API_BASE_URL = `${WORKER_URL}/api`;

// 构建视频 m3u8 URL
export function getVideoM3u8Url(videoId: string): string {
  return `${WORKER_URL}/${videoId}.m3u8`;
}

// 构建 API URL
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  return url.toString();
}
