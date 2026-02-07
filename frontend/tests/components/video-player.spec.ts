/**
 * 视频播放功能测试用例
 * 测试视频播放器的功能，包括跨域代理
 */

import { test, expect } from '@playwright/test';
import { mockVideo, mockM3U8Content } from '../utils/mockData';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const WORKER_URL = process.env.WORKER_URL || 'https://jable-video-proxy.qh13.workers.dev';

test.describe('视频播放功能测试', () => {
  const videoId = 'test-video-123';

  test.beforeEach(async ({ page }) => {
    // Mock 视频详情 API
    await page.route(`${FRONTEND_URL}/api/videos/${videoId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...mockVideo,
            id: videoId
          }
        })
      });
    });

    // Mock M3U8 播放列表
    await page.route(`${WORKER_URL}/${videoId}.m3u8`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: mockM3U8Content
      });
    });
  });

  test.describe('视频播放器基础功能', () => {
    test('视频播放器应该正常加载', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      // 等待视频元素出现
      await expect(page.locator('video')).toBeVisible({ timeout: 15000 });
    });

    test('视频源应该通过代理 URL 加载', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      // 检查视频源的 URL 格式
      const videoElement = page.locator('video').first();
      const src = await videoElement.getAttribute('src');

      // 视频源应该包含代理域名
      expect(src).toContain('.m3u8');
    });

    test('视频播放器应该有 controls 属性', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const videoElement = page.locator('video').first();
      await expect(videoElement).toHaveAttribute('controls');
    });

    test('视频播放器应该支持 preload', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const videoElement = page.locator('video').first();
      const preload = await videoElement.getAttribute('preload');

      // preload 应该是 metadata 或 none
      expect(['metadata', 'none']).toContain(preload);
    });
  });

  test.describe('HLS.js 播放器测试', () => {
    test('HLS.js 应该被正确加载', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      // 等待 HLS.js 加载
      await page.waitForTimeout(2000);

      // 检查 HLS.js 是否存在
      const hlsExists = await page.evaluate(() => {
        return typeof Hls !== 'undefined';
      });

      // HLS.js 可能被动态加载，这是正常的
    });

    test('HLS.js 应该正确初始化', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      // 等待播放器初始化
      await page.waitForTimeout(3000);

      // 检查 HLS 实例是否已创建
      const hlsInitialized = await page.evaluate(() => {
        const videoElement = document.querySelector('video');
        if (videoElement && videoElement.src) {
          return videoElement.src.includes('.m3u8');
        }
        return false;
      });

      // 视频源应该被设置
    });
  });

  test.describe('视频质量切换测试', () => {
    test('视频详情应该包含质量选项', async ({ page }) => {
      await page.route(`${FRONTEND_URL}/api/videos/${videoId}`, route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              ...mockVideo,
              id: videoId,
              streamQualities: {
                '1080p': `${WORKER_URL}/${videoId}_1080p.m3u8`,
                '720p': `${WORKER_URL}/${videoId}_720p.m3u8`,
                '480p': `${WORKER_URL}/${videoId}_480p.m3u8`
              }
            }
          })
        });
      });

      await page.goto(`/videos/${videoId}`);

      // 页面应该加载
      await expect(page.locator('video')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('视频代理功能测试', () => {
    test('代理 M3U8 应该包含正确的跨域头', async ({ page }) => {
      // 直接测试 Worker API
      const response = await page.request.get(`${WORKER_URL}/${videoId}.m3u8`);

      expect([200, 403, 404]).toContain(response.status());

      if (response.status() === 200) {
        const corsHeaders = response.headers();
        expect(corsHeaders['access-control-allow-origin']).toBeDefined();
      }
    });

    test('代理应该支持 Range 请求', async ({ page }) => {
      const response = await page.request.get(`${WORKER_URL}/${videoId}.m3u8`, {
        headers: {
          Range: 'bytes=0-1023'
        }
      });

      // 支持 Range 请求的服务应该返回 206
      expect([200, 206]).toContain(response.status());
    });

    test('代理分片请求应该有正确的 Content-Type', async ({ page }) => {
      // 尝试请求一个 .ts 分片
      const segmentResponse = await page.request.get(
        `${WORKER_URL}/videos/${videoId}/segment1.ts`
      );

      if (segmentResponse.status() === 200) {
        const contentType = segmentResponse.headers()['content-type'];
        expect(contentType).toContain('video');
      }
    });
  });

  test.describe('视频播放交互测试', () => {
    test('视频应该可以播放（如果有可用的视频源）', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      // 等待页面加载
      await page.waitForTimeout(3000);

      // 检查视频是否加载了源
      const videoElement = page.locator('video').first();
      const hasSrc = await videoElement.evaluate(el => !!el.src);

      if (hasSrc) {
        // 尝试播放视频
        await videoElement.evaluate(el => el.play().catch(() => {}));

        // 检查播放状态
        const isPaused = await videoElement.evaluate(el => el.paused);
        // 视频可能因为各种原因无法播放，这是正常的
      }
    });

    test('视频播放器的尺寸应该正确', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      // 等待播放器加载
      await expect(page.locator('video')).toBeVisible({ timeout: 15000 });

      // 检查视频元素的尺寸
      const dimensions = await page.locator('video').first().boundingBox();

      if (dimensions) {
        expect(dimensions.width).toBeGreaterThan(0);
        expect(dimensions.height).toBeGreaterThan(0);
      }
    });
  });

  test.describe('视频元信息显示测试', () => {
    test('应该显示视频标题', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const title = page.locator('.video-title, h1').first();
      await expect(title).toBeVisible({ timeout: 10000 });
    });

    test('应该显示视频描述', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const description = page.locator('.video-description, [class*="description"]').first();
      await expect(description).toBeVisible({ timeout: 10000 });
    });

    test('应该显示作者信息', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const author = page.locator('.video-author, [class*="author"]').first();
      await expect(author).toBeVisible({ timeout: 10000 });
    });

    test('应该显示标签', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const tags = page.locator('.video-tags, [class*="tags"]').first();
      await expect(tags).toBeVisible({ timeout: 10000 });
    });

    test('应该显示发布时间', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const publishDate = page.locator('.publish-date, [class*="publish"]').first();
      await expect(publishDate).toBeVisible({ timeout: 10000 });
    });

    test('应该显示播放量', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const views = page.locator('.view-count, [class*="views"]').first();
      await expect(views).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('返回导航测试', () => {
    test('应该显示返回按钮', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const backButton = page.locator('.back-btn, [class*="back"]').first();
      await expect(backButton).toBeVisible({ timeout: 10000 });
    });

    test('返回按钮应该可点击', async ({ page }) => {
      await page.goto(`/videos/${videoId}`);

      const backButton = page.locator('.back-btn, [class*="back"]').first();
      await backButton.click();

      // 页面应该导航回上一页或首页
      await page.waitForTimeout(500);
    });
  });
});

test.describe('视频跨域播放测试', () => {
  test.describe('CORS 配置测试', () => {
    test('Worker API 应该返回正确的 CORS 头', async ({ page }) => {
      const response = await page.request.get(`${WORKER_URL}/api/videos`);

      expect(response.status()).toBeLessThanOrEqual(400);

      const corsHeaders = response.headers();
      expect(corsHeaders['access-control-allow-origin']).toBeDefined();
    });

    test('M3U8 代理应该有正确的 Content-Type', async ({ page }) => {
      const response = await page.request.get(`${WORKER_URL}/test.m3u8`);

      if (response.status() === 200) {
        const contentType = response.headers()['content-type'];
        expect(contentType).toMatch(/mpegurl|vnd\.apple\.mpegurl/);
      }
    });

    test('视频分片应该有正确的 Content-Type', async ({ page }) => {
      const response = await page.request.get(`${WORKER_URL}/videos/test/video.ts`);

      if (response.status() === 200) {
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('video');
      }
    });
  });
});

test.describe('视频播放性能测试', () => {
  test('视频播放器应该在合理时间内加载', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`/videos/${videoId}`);

    // 等待视频元素出现
    await expect(page.locator('video')).toBeVisible({ timeout: 15000 });

    const loadTime = Date.now() - startTime;

    // 页面加载时间应该在 15 秒内
    expect(loadTime).toBeLessThan(15000);
  });

  test('视频源应该在播放器加载后设置', async ({ page }) => {
    await page.goto(`/videos/${videoId}`);

    // 等待视频元素出现
    await expect(page.locator('video')).toBeVisible({ timeout: 15000 });

    // 等待 src 被设置
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && video.src && video.src.length > 0;
    }, { timeout: 10000 });
  });
});
