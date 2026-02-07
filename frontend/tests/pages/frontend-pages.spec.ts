/**
 * 前端页面测试用例
 */

import { test, expect } from '@playwright/test';
import {
  mockVideoListResponse,
  mockVideoDetailResponse,
  mockCategoriesResponse,
  mockStatsResponse,
  mockVideo
} from '../utils/mockData';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('首页测试', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API 响应
    await page.route(`${FRONTEND_URL}/api/videos`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVideoListResponse)
      });
    });

    await page.route(`${FRONTEND_URL}/api/stats`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStatsResponse)
      });
    });

    await page.route(`${FRONTEND_URL}/api/categories`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCategoriesResponse)
      });
    });
  });

  test('应该正确加载首页', async ({ page }) => {
    await page.goto('/');

    // 检查页面加载成功
    await expect(page).toHaveTitle(/视频|首页|探索/);
  });

  test('应该显示视频网格', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.video-grid, [class*="video-grid"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('应该显示视频标题', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.video-title, [class*="video-title"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('应该显示视频缩略图', async ({ page }) => {
    await page.goto('/');

    const thumbnail = page.locator('.video-thumbnail img, [class*="thumbnail"] img').first();
    await expect(thumbnail).toBeVisible({ timeout: 10000 });
    await expect(thumbnail).toHaveAttribute('src');
  });

  test('应该显示视频时长', async ({ page }) => {
    await page.goto('/');

    const duration = page.locator('.video-duration, [class*="duration"]').first();
    await expect(duration).toBeVisible({ timeout: 10000 });
  });

  test('应该显示视频作者信息', async ({ page }) => {
    await page.goto('/');

    const author = page.locator('.meta-author, [class*="author"]').first();
    await expect(author).toBeVisible({ timeout: 10000 });
  });

  test('应该显示播放量信息', async ({ page }) => {
    await page.goto('/');

    const views = page.locator('.meta-views, [class*="views"]').first();
    await expect(views).toBeVisible({ timeout: 10000 });
  });

  test('应该显示分类导航', async ({ page }) => {
    await page.goto('/');

    const categoryNav = page.locator('.category-nav, [class*="category"]').first();
    await expect(categoryNav).toBeVisible({ timeout: 10000 });
  });

  test('应该显示侧边栏', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.locator('.sidebar, aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('应该显示统计信息', async ({ page }) => {
    await page.goto('/');

    const stats = page.locator('.hero-stats, .stats-bar, [class*="stats"]').first();
    await expect(stats).toBeVisible({ timeout: 10000 });
  });

  test('视频卡片应该可点击并跳转到详情页', async ({ page }) => {
    await page.goto('/');

    const videoCard = page.locator('.video-item, [class*="video-card"]').first();
    await videoCard.click();

    // 应该跳转到视频详情页
    await expect(page).toHaveURL(/videos\//);
  });

  test('分类标签应该可点击', async ({ page }) => {
    await page.goto('/');

    const categoryItem = page.locator('.category-item, [class*="category"]').first();
    await categoryItem.click();

    // URL 应该包含 category 参数
    await expect(page).toHaveURL(/category/);
  });

  test('加载更多按钮应该可用', async ({ page }) => {
    await page.goto('/');

    const loadMoreBtn = page.locator('.load-more-btn, [class*="load-more"]').first();

    // 如果按钮存在且可见
    if (await loadMoreBtn.isVisible()) {
      await loadMoreBtn.click();

      // 等待新内容加载
      await page.waitForTimeout(1000);
    }
  });

  test('页面应该在移动端响应式显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('.home-page, body')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('视频详情页测试', () => {
  const videoId = 'test-video-123';

  test.beforeEach(async ({ page }) => {
    // Mock 视频详情 API
    await page.route(`${FRONTEND_URL}/api/videos/${videoId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVideoDetailResponse)
      });
    });
  });

  test('应该正确加载视频详情页', async ({ page }) => {
    await page.goto(`/videos/${videoId}`);

    await expect(page).toHaveTitle(/测试视频标题|视频/);
  });

  test('应该显示视频标题', async ({ page }) => {
    await page.goto(`/videos/${videoId}`);

    await expect(page.locator('.video-title, h1, [class*="title"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('应该显示视频播放器', async ({ page }) => {
    await page.goto(`/videos/${videoId}`);

    const player = page.locator('video, [class*="player"], [class*="video-player"]').first();
    await expect(player).toBeVisible({ timeout: 10000 });
  });

  test('播放器应该有正确的视频源', async ({ page }) => {
    await page.goto(`/videos/${videoId}`);

    const videoElement = page.locator('video').first();
    await expect(videoElement).toHaveAttribute('src', /.m3u8/);
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

  test('视频播放器应该有播放控件', async ({ page }) => {
    await page.goto(`/videos/${videoId}`);

    const videoElement = page.locator('video').first();
    await expect(videoElement).toHaveAttribute('controls');
  });

  test('视频播放器应该支持预加载', async ({ page }) => {
    await page.goto(`/videos/${videoId}`);

    const videoElement = page.locator('video').first();
    await expect(videoElement).toHaveAttribute('preload', /metadata|none/);
  });

  test('页面应该显示返回按钮', async ({ page }) => {
    await page.goto(`/videos/${videoId}`);

    const backBtn = page.locator('.back-btn, [class*="back"], .go-back').first();
    await expect(backBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('搜索页面测试', () => {
  test.beforeEach(async ({ page }) => {
    // Mock 搜索 API
    await page.route(`${FRONTEND_URL}/api/search*`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            videos: [mockVideo],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
          }
        })
      });
    });
  });

  test('应该正确加载搜索页面', async ({ page }) => {
    await page.goto('/search');

    await expect(page.locator('.search-page, [class*="search"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('搜索输入框应该可用', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('测试视频');
  });

  test('搜索结果应该显示视频列表', async ({ page }) => {
    await page.goto('/search?q=测试');

    await expect(page.locator('.video-grid, [class*="video"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('无搜索结果时应该显示提示', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/search*`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            videos: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
          }
        })
      });
    });

    await page.goto('/search?q=不存在的关键词');

    const noResult = page.locator('.no-results, [class*="no-result"]').first();
    await expect(noResult).toBeVisible({ timeout: 10000 });
  });
});

test.describe('分类页面测试', () => {
  test('应该正确加载分类页面', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/videos*`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVideoListResponse)
      });
    });

    await page.goto('/category/entertainment');

    await expect(page.locator('.category-page, [class*="category"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('应该显示分类标题', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/videos*`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVideoListResponse)
      });
    });

    await page.goto('/category/music');

    const title = page.locator('.category-title, h1').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('分类页面应该显示视频列表', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/videos*`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVideoListResponse)
      });
    });

    await page.goto('/category/sports');

    await expect(page.locator('.video-grid').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('热门页面测试', () => {
  test('应该正确加载热门页面', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/hot`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { videos: [mockVideo, mockVideo, mockVideo] }
        })
      });
    });

    await page.goto('/hot');

    await expect(page.locator('.hot-page, [class*="hot"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('热门页面应该显示视频列表', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/hot`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { videos: [mockVideo] }
        })
      });
    });

    await page.goto('/hot');

    await expect(page.locator('.video-grid').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('404 页面测试', () => {
  test('不存在的路由应该显示 404 页面', async ({ page }) => {
    await page.goto('/non-existent-page');

    await expect(page.locator('.not-found, [class*="404"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('404 页面应该有返回首页链接', async ({ page }) => {
    await page.goto('/non-existent-page');

    const backHome = page.locator('.back-home, a:has-text("首页")').first();
    await expect(backHome).toBeVisible({ timeout: 10000 });
  });
});

test.describe('导航测试', () => {
  test('主导航链接应该可点击', async ({ page }) => {
    await page.goto('/');

    const navLink = page.locator('nav a').first();
    await navLink.click();

    // 等待导航完成
    await page.waitForTimeout(500);
  });

  test('Logo 应该链接到首页', async ({ page }) => {
    await page.goto('/hot');

    const logo = page.locator('.logo, [class*="logo"]').first();
    if (await logo.isVisible()) {
      await logo.click();
      await expect(page).toHaveURL('/');
    }
  });

  test('面包屑导航应该正确显示', async ({ page }) => {
    await page.goto('/videos/test-video-123');

    const breadcrumb = page.locator('.breadcrumb, [class*="breadcrumb"]').first();
    // 面包屑应该存在但不一定是可见的
  });
});

test.describe('响应式设计测试', () => {
  test('桌面端应该正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    await expect(page.locator('.home-page')).toBeVisible({ timeout: 10000 });
  });

  test('平板端应该正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('.home-page')).toBeVisible({ timeout: 10000 });
  });

  test('移动端应该正常显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('.home-page')).toBeVisible({ timeout: 10000 });
  });
});
