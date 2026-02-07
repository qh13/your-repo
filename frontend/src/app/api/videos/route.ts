import { NextResponse } from 'next/server';

/**
 * 视频列表 API
 *
 * GET /api/videos
 * 获取视频列表，支持分页、分类筛选和搜索
 */

// 模拟数据缓存
interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  publishDate: string;
  coverUrl: string;
  category: string;
  categoryName: string;
  authorName: string;
  tags: string[];
  scrapedAt: string;
  viewCount: number;
}

const videoCache: { videos: Video[]; lastUpdate: number; CACHE_DURATION: number } = {
  videos: [],
  lastUpdate: 0,
  CACHE_DURATION: 60000 // 1分钟缓存
};

/**
 * 生成模拟视频数据
 */
function generateMockVideos(count = 20) {
  const categories = ['最新', '热门', '娱乐', '音乐', '体育', '科技', '生活'];
  const mockVideos = [];
  
  for (let i = 1; i <= count; i++) {
    const id = `video-${i}`;
    mockVideos.push({
      id,
      title: `示例视频标题 ${i} - 精彩内容抢先看`,
      description: `这是视频 ${i} 的详细描述，介绍视频的内容和背景信息。视频包含精彩的画面和内容，值得一看。`,
      duration: `${Math.floor(Math.random() * 59) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      views: `${(Math.random() * 100).toFixed(1)}万`,
      publishDate: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      coverUrl: `https://picsum.photos/seed/${id}/640/360`,
      category: categories[Math.floor(Math.random() * categories.length)],
      categoryName: categories[Math.floor(Math.random() * categories.length)],
      authorName: `作者${i}`,
      tags: ['标签1', '标签2', '标签3'],
      scrapedAt: new Date().toISOString(),
      viewCount: Math.floor(Math.random() * 10000)
    });
  }
  
  return mockVideos;
}

/**
 * 刷新缓存
 */
function refreshCache() {
  const now = Date.now();
  if (now - videoCache.lastUpdate > videoCache.CACHE_DURATION) {
    videoCache.videos = generateMockVideos(50);
    videoCache.lastUpdate = now;
  }
}

/**
 * GET /api/videos
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  try {
    // 刷新缓存
    refreshCache();

    let videos = [...videoCache.videos];

    // 分类筛选
    if (category && category !== 'all' && category !== 'uncategorized') {
      videos = videos.filter(v => 
        v.category.toLowerCase() === category.toLowerCase() ||
        v.categoryName.toLowerCase() === category.toLowerCase()
      );
    }

    // 搜索
    if (search) {
      const searchLower = search.toLowerCase();
      videos = videos.filter(v => 
        v.title.toLowerCase().includes(searchLower) ||
        v.description.toLowerCase().includes(searchLower)
      );
    }

    // 分页
    const total = videos.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedVideos = videos.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取视频列表失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
