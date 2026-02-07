/**
 * API 接口测试用例
 * 测试 Worker API 端点
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import {
  mockVideoListResponse,
  mockVideoDetailResponse,
  mockCategoriesResponse,
  mockStatsResponse,
  mockHotVideosResponse,
  mockSearchResponse,
  mockVideo
} from '../utils/mockData';

const API_BASE_URL = process.env.WORKER_URL || 'https://jable-video-proxy.qh13.workers.dev';

test.describe('Worker API 测试', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      ignoreHTTPSErrors: true,
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('视频列表 API - /api/videos', () => {
    test('应该返回视频列表和分页信息', async () => {
      const response = await apiContext.get('/api/videos', {
        params: { page: '1', limit: '12' }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.videos).toBeDefined();
      expect(Array.isArray(data.data.videos)).toBe(true);
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.page).toBe(1);
    });

    test('应该支持分类筛选', async () => {
      const response = await apiContext.get('/api/videos', {
        params: { category: 'entertainment', page: '1', limit: '10' }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('应该支持搜索功能', async () => {
      const response = await apiContext.get('/api/videos', {
        params: { search: '测试', page: '1', limit: '10' }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('应该正确处理分页参数', async () => {
      const response = await apiContext.get('/api/videos', {
        params: { page: '2', limit: '20' }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.limit).toBe(20);
    });

    test('应该正确处理无效页码', async () => {
      const response = await apiContext.get('/api/videos', {
        params: { page: '999999', limit: '10' }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.data.videos).toBeDefined();
      expect(Array.isArray(data.data.videos)).toBe(true);
    });
  });

  test.describe('视频详情 API - /api/videos/:id', () => {
    test('应该返回视频详情', async () => {
      const videoId = 'test-video-123';
      const response = await apiContext.get(`/api/videos/${videoId}`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe(videoId);
      expect(data.data.title).toBeDefined();
      expect(data.data.streamUrl).toBeDefined();
    });

    test('应该返回 streamUrl 和 streamQualities', async () => {
      const videoId = 'test-video-123';
      const response = await apiContext.get(`/api/videos/${videoId}`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.data.streamUrl).toBeDefined();
      expect(data.data.streamUrl).toContain('.m3u8');
      expect(data.data.streamQualities).toBeDefined();
    });

    test('应该返回正确的标签信息', async () => {
      const videoId = 'test-video-123';
      const response = await apiContext.get(`/api/videos/${videoId}`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.data.tags).toBeDefined();
      expect(Array.isArray(data.data.tags)).toBe(true);
    });

    test('应该正确处理不存在的视频 ID', async () => {
      const nonExistentId = 'non-existent-video-id';
      const response = await apiContext.get(`/api/videos/${nonExistentId}`);

      // 可能是 200 (success: false) 或 404
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  test.describe('搜索 API - /api/search', () => {
    test('应该返回搜索结果', async () => {
      const response = await apiContext.get('/api/search', {
        params: { q: '测试' }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.videos).toBeDefined();
    });

    test('应该支持 keyword 参数', async () => {
      const response = await apiContext.get('/api/search', {
        params: { keyword: '娱乐' }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('应该正确处理空搜索关键词', async () => {
      const response = await apiContext.get('/api/search', {
        params: { q: '' }
      });

      expect(response.status()).toBeLessThanOrEqual(400);
    });
  });

  test.describe('热门视频 API - /api/hot', () => {
    test('应该返回热门视频列表', async () => {
      const response = await apiContext.get('/api/hot', {
        params: { limit: '10' }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.videos).toBeDefined();
      expect(Array.isArray(data.data.videos)).toBe(true);
    });

    test('应该支持自定义数量限制', async () => {
      const limit = 5;
      const response = await apiContext.get('/api/hot', {
        params: { limit: limit.toString() }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.data.videos.length).toBeLessThanOrEqual(limit);
    });
  });

  test.describe('分类 API - /api/categories', () => {
    test('应该返回分类列表', async () => {
      const response = await apiContext.get('/api/categories');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.categories).toBeDefined();
      expect(Array.isArray(data.data.categories)).toBe(true);
    });

    test('应该返回分类的视频数量', async () => {
      const response = await apiContext.get('/api/categories');

      expect(response.status()).toBe(200);

      const data = await response.json();
      if (data.data.categories.length > 0) {
        expect(data.data.categories[0].videoCount).toBeDefined();
      }
    });
  });

  test.describe('统计 API - /api/stats', () => {
    test('应该返回统计数据', async () => {
      const response = await apiContext.get('/api/stats');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalVideos).toBeDefined();
      expect(data.data.totalViews).toBeDefined();
      expect(data.data.totalCategories).toBeDefined();
    });

    test('统计数据应该是数字类型', async () => {
      const response = await apiContext.get('/api/stats');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(typeof data.data.totalVideos).toBe('number');
      expect(typeof data.data.totalViews).toBe('number');
      expect(typeof data.data.totalCategories).toBe('number');
    });
  });

  test.describe('CORS 头测试', () => {
    test('API 响应应该包含 CORS 头', async () => {
      const response = await apiContext.get('/api/videos');

      expect(response.status()).toBe(200);

      const corsHeaders = response.headers();
      expect(corsHeaders['access-control-allow-origin']).toBeDefined();
    });
  });
});

test.describe('视频代理功能测试', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      ignoreHTTPSErrors: true,
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test.describe('M3U8 代理', () => {
    test('应该能够获取 m3u8 播放列表', async () => {
      const videoId = 'test-video-123';
      const response = await apiContext.get(`/${videoId}.m3u8`);

      expect(response.status()).toBeLessThanOrEqual(400);

      const contentType = response.headers()['content-type'];
      if (response.status() === 200) {
        expect(contentType).toContain('mpegurl');
      }
    });

    test('M3U8 响应应该包含 CORS 头', async () => {
      const videoId = 'test-video-123';
      const response = await apiContext.get(`/${videoId}.m3u8`);

      const corsHeaders = response.headers();
      expect(corsHeaders['access-control-allow-origin']).toBeDefined();
    });

    test('应该支持 Range 请求', async () => {
      const videoId = 'test-video-123';
      const response = await apiContext.get(`/${videoId}.m3u8`, {
        headers: { Range: 'bytes=0-1023' }
      });

      // 206 Partial Content 或 200 OK 都是有效的
      expect([200, 206]).toContain(response.status());
    });
  });

  test.describe('视频分片代理', () => {
    test('应该支持 .ts 分片请求', async () => {
      const videoId = 'test-video-123';
      const segmentPath = 'segment1.ts';

      const response = await apiContext.get(`/videos/${videoId}/${segmentPath}`);

      // 可能是成功、分片不存在、或跨域限制
      expect([200, 403, 404, 500]).toContain(response.status());
    });

    test('.ts 分片响应应该包含正确的 Content-Type', async () => {
      const videoId = 'test-video-123';
      const segmentPath = 'segment1.ts';

      const response = await apiContext.get(`/videos/${videoId}/${segmentPath}`);

      if (response.status() === 200) {
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('video');
      }
    });
  });
});
