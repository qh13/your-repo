/**
 * API 配置
 */

// 检测是否为开发环境
const isDevelopment = process.env.NODE_ENV === 'development' ||
                      process.env.VERCEL_ENV === 'development' ||
                      !process.env.VERCEL_ENV;

// Worker 代理地址 - 已部署到 Cloudflare Workers
// 注意：中国大陆可能无法访问 workers.dev，需要使用自定义域名

// 使用自定义域名（如果已配置），否则回退到 workers.dev
export const WORKER_URL = isDevelopment 
  ? process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:3000'
  : (process.env.NEXT_PUBLIC_WORKER_URL || 'https://api.sexxyvideo.dpdns.org');

// API 基础地址
export const API_BASE_URL = `${WORKER_URL}/api`;

// 默认封面图
export const DEFAULT_COVER = '/placeholder.jpg';

/**
 * 构建视频 m3u8 URL
 * @param {string} videoId - 视频 ID
 * @returns {string} 代理后的 m3u8 URL
 */
export function getVideoM3u8Url(videoId: string): string {
  // 本地开发时使用本地 API，生产环境使用 Worker
  if (isDevelopment && !process.env.NEXT_PUBLIC_USE_WORKER) {
    return `${WORKER_URL}/api/videos/${videoId}/stream`;
  }
  return `${WORKER_URL}/${videoId}.m3u8`;
}

/**
 * 视频详情接口
 * @param {string} videoId - 视频 ID
 * @returns {string} API URL
 */
export function getVideoDetailUrl(videoId: string): string {
  return `${API_BASE_URL}/videos/${videoId}`;
}

/**
 * 视频列表接口
 * @param {object} params - 查询参数
 * @returns {string} API URL
 */
export function getVideoListUrl(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): string {
  const url = new URL(`${API_BASE_URL}/videos`);
  
  if (params?.page) url.searchParams.set('page', params.page.toString());
  if (params?.limit) url.searchParams.set('limit', params.limit.toString());
  if (params?.category) url.searchParams.set('category', params.category);
  if (params?.search) url.searchParams.set('search', params.search);
  
  return url.toString();
}

/**
 * 搜索视频接口
 * @param {string} keyword - 搜索关键词
 * @returns {string} API URL
 */
export function getSearchUrl(keyword: string): string {
  const url = new URL(`${API_BASE_URL}/search`);
  url.searchParams.set('q', keyword);
  return url.toString();
}

/**
 * 热门视频接口
 * @param {number} limit - 数量限制
 * @returns {string} API URL
 */
export function getHotVideosUrl(limit: number = 10): string {
  const url = new URL(`${API_BASE_URL}/hot`);
  url.searchParams.set('limit', limit.toString());
  return url.toString();
}

/**
 * 分类列表接口
 * @returns {string} API URL
 */
export function getCategoriesUrl(): string {
  return `${API_BASE_URL}/categories`;
}

/**
 * 网站统计接口
 * @returns {string} API URL
 */
export function getStatsUrl(): string {
  return `${API_BASE_URL}/stats`;
}
