/**
 * 视频数据获取模块
 * 直接从 Cloudflare Worker API 获取数据
 */

import {
  getVideoListUrl,
  getVideoDetailUrl,
  getSearchUrl,
  getHotVideosUrl,
  getCategoriesUrl,
  getStatsUrl,
  WORKER_URL
} from './api';

// 类型定义
export interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  publishDate: string;
  coverUrl: string;
  // 封面图别名
  thumbnail?: string;
  category: string;
  categoryName: string;
  authorName: string;
  // 作者别名
  author?: string;
  tags: string[];
  scrapedAt: string;
  viewCount: number;
  // 来源标识
  source?: string;
  // 视频详情额外字段
  streamUrl?: string;
  streamBackupUrls?: string[];
  streamQualities?: Record<string, string>;
}

export interface VideoListResponse {
  success: boolean;
  data: {
    videos: Video[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export interface VideoDetailResponse {
  success: boolean;
  data: Video;
  error?: string;
  errorCode?: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  videoCount: number;
}

export interface CategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
  };
  error?: string;
}

export interface Stats {
  totalVideos: number;
  totalViews: number;
  totalCategories: number;
}

export interface StatsResponse {
  success: boolean;
  data: Stats;
  error?: string;
}

/**
 * API 响应处理
 */
async function fetchApi<T>(url: string): Promise<T> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * 获取视频列表
 */
export async function getVideoList(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<VideoListResponse> {
  const url = getVideoListUrl(params);
  return fetchApi<VideoListResponse>(url);
}

/**
 * 获取视频详情
 */
export async function getVideoDetail(videoId: string): Promise<VideoDetailResponse> {
  const url = getVideoDetailUrl(videoId);
  return fetchApi<VideoDetailResponse>(url);
}

/**
 * 搜索视频
 */
export async function searchVideos(keyword: string): Promise<VideoListResponse> {
  const url = getSearchUrl(keyword);
  return fetchApi<VideoListResponse>(url);
}

/**
 * 获取热门视频
 */
export async function getHotVideos(limit: number = 10): Promise<VideoListResponse> {
  const url = getHotVideosUrl(limit);
  return fetchApi<VideoListResponse>(url);
}

/**
 * 获取分类列表
 */
export async function getCategories(): Promise<CategoriesResponse> {
  const url = getCategoriesUrl();
  return fetchApi<CategoriesResponse>(url);
}

/**
 * 获取网站统计
 */
export async function getStats(): Promise<StatsResponse> {
  const url = getStatsUrl();
  return fetchApi<StatsResponse>(url);
}

/**
 * 获取 Worker 健康状态
 */
export async function checkWorkerStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/api/stats`);
    return response.ok;
  } catch {
    return false;
  }
}
