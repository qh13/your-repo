/**
 * 测试工具函数和 Mock 数据
 */

import type { Route } from '@playwright/test';

/**
 * 模拟视频数据
 */
export const mockVideo = {
  id: 'test-video-123',
  title: '测试视频标题',
  description: '这是一个测试视频的描述信息',
  duration: '12:34',
  views: '1.2M',
  publishDate: '2024-01-15',
  coverUrl: 'https://example.jable.tv/cover/test.jpg',
  thumbnail: 'https://example.jable.tv/thumb/test.jpg',
  category: 'entertainment',
  categoryName: '娱乐',
  authorName: '测试作者',
  author: '测试作者',
  tags: ['测试', '娱乐', '精彩'],
  scrapedAt: '2024-01-15T10:30:00Z',
  viewCount: 1234567,
  source: 'jable.tv',
  streamUrl: 'https://proxy.example.workers.dev/test-video-123.m3u8',
  streamBackupUrls: [
    'https://backup1.example.com/video.m3u8',
    'https://backup2.example.com/video.m3u8'
  ],
  streamQualities: {
    '1080p': 'https://proxy.example.workers.dev/test-video-123_1080p.m3u8',
    '720p': 'https://proxy.example.workers.dev/test-video-123_720p.m3u8',
    '480p': 'https://proxy.example.workers.dev/test-video-123_480p.m3u8'
  }
};

/**
 * 模拟视频列表响应
 */
export const mockVideoListResponse = {
  success: true,
  data: {
    videos: [
      {
        ...mockVideo,
        id: 'video-001',
        title: '视频标题 1'
      },
      {
        ...mockVideo,
        id: 'video-002',
        title: '视频标题 2'
      },
      {
        ...mockVideo,
        id: 'video-003',
        title: '视频标题 3'
      }
    ],
    pagination: {
      page: 1,
      limit: 12,
      total: 100,
      totalPages: 9
    }
  }
};

/**
 * 模拟视频详情响应
 */
export const mockVideoDetailResponse = {
  success: true,
  data: mockVideo
};

/**
 * 模拟分类列表响应
 */
export const mockCategoriesResponse = {
  success: true,
  data: {
    categories: [
      {
        slug: 'entertainment',
        name: '娱乐',
        description: '娱乐综艺类视频',
        videoCount: 50
      },
      {
        slug: 'music',
        name: '音乐',
        description: '音乐现场和MV',
        videoCount: 30
      },
      {
        slug: 'sports',
        name: '体育',
        description: '体育赛事和集锦',
        videoCount: 25
      },
      {
        slug: 'gaming',
        name: '游戏',
        description: '游戏解说和直播',
        videoCount: 40
      }
    ]
  }
};

/**
 * 模拟统计数据响应
 */
export const mockStatsResponse = {
  success: true,
  data: {
    totalVideos: 1000,
    totalViews: 50000000,
    totalCategories: 15
  }
};

/**
 * 模拟热门视频响应
 */
export const mockHotVideosResponse = {
  success: true,
  data: {
    videos: [
      { ...mockVideo, id: 'hot-001', title: '热门视频 1', viewCount: 999999 },
      { ...mockVideo, id: 'hot-002', title: '热门视频 2', viewCount: 888888 },
      { ...mockVideo, id: 'hot-003', title: '热门视频 3', viewCount: 777777 }
    ]
  }
};

/**
 * 模拟搜索结果响应
 */
export const mockSearchResponse = {
  success: true,
  data: {
    videos: [
      {
        ...mockVideo,
        id: 'search-001',
        title: '搜索结果视频 1'
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1
    }
  }
};

/**
 * 模拟 M3U8 播放列表内容
 */
export const mockM3U8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480
480p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
`;

/**
 * 模拟分片内容
 */
export const mockTSContent = Buffer.from([0x00, 0x00, 0x01, 0xBA, 0x44, 0x3C, 0x00, 0x00]);

/**
 * 等待指定时间
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 生成随机视频数据
 */
export const generateRandomVideos = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockVideo,
    id: `random-video-${Date.now()}-${i}`,
    title: `随机视频 ${i + 1}`
  }));
};

/**
 * 格式化数字显示
 */
export const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  return num.toString();
};

/**
 * 检查页面元素是否存在
 */
export const hasElement = async (page: any, selector: string): Promise<boolean> => {
  try {
    await page.waitForSelector(selector, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
};

/**
 * 获取元素文本内容
 */
export const getElementText = async (page: any, selector: string): Promise<string> => {
  const element = await page.locator(selector);
  return element.textContent();
};

/**
 * 模拟 API 响应
 */
export const createApiMock = (page: any, url: string, response: any, status = 200) => {
  return page.route(url, (route: Route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
};

/**
 * 模拟页面路由
 */
export const createPageMock = (page: any, url: string, html: string) => {
  return page.route(url, (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: html
    });
  });
};

/**
 * 测试数据工厂
 */
export const TestDataFactory = {
  createVideo(overrides = {}) {
    return { ...mockVideo, ...overrides };
  },

  createVideoList(count = 10, overrides = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.createVideo({
        id: `video-${i}`,
        title: `测试视频 ${i + 1}`,
        ...overrides
      })
    );
  },

  createPagination(total = 100, limit = 12) {
    return {
      page: 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  },

  createCategory(overrides = {}) {
    return {
      slug: 'test-category',
      name: '测试分类',
      description: '测试分类描述',
      videoCount: 10,
      ...overrides
    };
  }
};
