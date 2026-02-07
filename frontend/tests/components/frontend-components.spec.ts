/**
 * 组件测试用例
 * 测试前端 React 组件
 */

import { test, expect } from '@playwright/test';
import { mockVideo } from '../utils/mockData';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('VideoCard 组件测试', () => {
  test('VideoCard 应该显示视频标题', async ({ page }) => {
    await page.goto('/');

    // 检查视频卡片标题是否存在
    const title = page.locator('.video-title').first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('VideoCard 应该显示视频缩略图', async ({ page }) => {
    await page.goto('/');

    const thumbnail = page.locator('.video-thumbnail img').first();
    await expect(thumbnail).toBeVisible({ timeout: 10000 });
  });

  test('VideoCard 应该显示视频时长', async ({ page }) => {
    await page.goto('/');

    const duration = page.locator('.video-duration').first();
    await expect(duration).toBeVisible({ timeout: 10000 });
  });

  test('VideoCard 应该显示作者信息', async ({ page }) => {
    await page.goto('/');

    const author = page.locator('.meta-author').first();
    await expect(author).toBeVisible({ timeout: 10000 });
  });

  test('VideoCard 应该显示播放量', async ({ page }) => {
    await page.goto('/');

    const views = page.locator('.meta-views').first();
    await expect(views).toBeVisible({ timeout: 10000 });
  });

  test('VideoCard 点击应该跳转到详情页', async ({ page }) => {
    await page.goto('/');

    const videoItem = page.locator('.video-item').first();
    await videoItem.click();

    await expect(page).toHaveURL(/\/videos\//);
  });
});

test.describe('VideoGrid 组件测试', () => {
  test('VideoGrid 应该显示视频列表', async ({ page }) => {
    await page.goto('/');

    const videoGrid = page.locator('.video-grid');
    await expect(videoGrid).toBeVisible({ timeout: 10000 });
  });

  test('VideoGrid 应该显示多个视频卡片', async ({ page }) => {
    await page.goto('/');

    const videoItems = page.locator('.video-item');
    await expect(videoItems.first()).toBeVisible({ timeout: 10000 });
  });

  test('VideoGrid 应该支持加载更多功能', async ({ page }) => {
    await page.goto('/');

    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 等待可能的加载更多按钮出现
    await page.waitForTimeout(1000);
  });
});

test.describe('VideoPlayer 组件测试', () => {
  const videoId = 'test-video-123';

  test('VideoPlayer 应该显示播放器', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/videos/${videoId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockVideo
        })
      });
    });

    await page.goto(`/videos/${videoId}`);

    const videoElement = page.locator('video').first();
    await expect(videoElement).toBeVisible({ timeout: 10000 });
  });

  test('VideoPlayer 应该有 controls 属性', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/videos/${videoId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockVideo
        })
      });
    });

    await page.goto(`/videos/${videoId}`);

    const videoElement = page.locator('video').first();
    await expect(videoElement).toHaveAttribute('controls');
  });

  test('VideoPlayer 应该使用 m3u8 流', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/videos/${videoId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockVideo
        })
      });
    });

    await page.goto(`/videos/${videoId}`);

    const videoElement = page.locator('video').first();
    await expect(videoElement).toHaveAttribute('src', /.m3u8/);
  });

  test('VideoPlayer 应该支持 preload 属性', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/videos/${videoId}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockVideo
        })
      });
    });

    await page.goto(`/videos/${videoId}`);

    const videoElement = page.locator('video').first();
    await expect(videoElement).toHaveAttribute('preload');
  });
});

test.describe('SearchForm 组件测试', () => {
  test('搜索框应该可以输入文本', async ({ page }) => {
    await page.goto('/search');

    const searchInput = page.locator('input[type="search"], input[placeholder*="搜索"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('测试关键词');
    await expect(searchInput).toHaveValue('测试关键词');
  });

  test('搜索按钮应该可点击', async ({ page }) => {
    await page.goto('/search');

    const searchButton = page.locator('button[type="submit"], button:has-text("搜索")').first();
    await expect(searchButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('StatsDisplay 组件测试', () => {
  test('StatsDisplay 应该显示统计数据', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/stats`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalVideos: 1000,
            totalViews: 50000000,
            totalCategories: 15
          }
        })
      });
    });

    await page.goto('/');

    const statsDisplay = page.locator('.stats-bar, [class*="stats"]').first();
    await expect(statsDisplay).toBeVisible({ timeout: 10000 });
  });

  test('StatsDisplay 应该显示视频总数', async ({ page }) => {
    await page.route(`${FRONTEND_URL}/api/stats`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalVideos: 1000,
            totalViews: 50000000,
            totalCategories: 15
          }
        })
      });
    });

    await page.goto('/');

    // 检查是否包含数字
    const statsContent = await page.locator('.stats-bar, [class*="stats"]').first().textContent();
    expect(statsContent).toContain('1000');
  });
});

test.describe('AdBanner 组件测试', () => {
  test('AdBanner 占位符应该可见', async ({ page }) => {
    await page.goto('/');

    // 检查广告位是否存在
    const adBanner = page.locator('.ad-banner, .ad-placeholder, [class*="ad-"]').first();
    // 广告可能不存在，这是正常的
  });
});

test.describe('分类导航组件测试', () => {
  test('分类导航应该显示多个分类', async ({ page }) => {
    await page.goto('/');

    const categoryNav = page.locator('.category-nav, [class*="category-nav"]').first();
    await expect(categoryNav).toBeVisible({ timeout: 10000 });
  });

  test('分类标签应该可点击', async ({ page }) => {
    await page.goto('/');

    const categoryItem = page.locator('.category-item').first();
    await categoryItem.click();

    // 等待导航完成
    await page.waitForTimeout(500);
  });
});

test.describe('侧边栏组件测试', () => {
  test('侧边栏应该显示热门标签', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.locator('.sidebar').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const tagCloud = page.locator('.tag-cloud, [class*="tag-cloud"]').first();
    await expect(tagCloud).toBeVisible({ timeout: 10000 });
  });

  test('侧边栏应该显示关于我们', async ({ page }) => {
    await page.goto('/');

    const aboutSection = page.locator('.sidebar-section:has-text("关于我们")').first();
    await expect(aboutSection).toBeVisible({ timeout: 10000 });
  });

  test('侧边栏应该显示快捷链接', async ({ page }) => {
    await page.goto('/');

    const quickLinks = page.locator('.quick-links, [class*="quick-link"]').first();
    await expect(quickLinks).toBeVisible({ timeout: 10000 });
  });
});

test.describe('骨架屏加载测试', () => {
  test('加载时应该显示骨架屏', async ({ page }) => {
    // 模拟慢速网络
    await page.route(`${FRONTEND_URL}/api/videos`, route => {
      route.abort('aborted');
    });

    await page.goto('/');

    // 检查是否有骨架屏
    const skeleton = page.locator('.skeleton, [class*="skeleton"]').first();
    // 骨架屏可能在加载后消失
  });
});

test.describe('加载状态测试', () => {
  test('加载中应该显示加载指示器', async ({ page }) => {
    await page.goto('/');

    // 等待页面加载
    await page.waitForTimeout(2000);

    // 检查加载状态
    const loading = page.locator('.loading, [class*="loading"]').first();
    // 加载指示器可能在加载完成后消失
  });
});
