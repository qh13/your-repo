/**
 * API 配置
 */

const isDevelopment = process.env.NODE_ENV === 'development' ||
                      process.env.VERCEL_ENV === 'development' ||
                      !process.env.VERCEL_ENV;

// Worker 代理地址
export const WORKER_URL = isDevelopment 
  ? process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:3000'
  : (process.env.NEXT_PUBLIC_WORKER_URL || 'https://api.sexxyvideo.dpdns.org');

export const API_BASE_URL = `${WORKER_URL}/api`;

// 构建视频 m3u8 URL
export function getVideoM3u8Url(videoId: string): string {
  if (isDevelopment && !process.env.NEXT_PUBLIC_USE_WORKER) {
    return `${WORKER_URL}/api/videos/${videoId}/stream`;
  }
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
