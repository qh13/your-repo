import { NextResponse } from 'next/server';

/**
 * 视频详情 API
 *
 * GET /api/videos/[id]
 * 获取指定视频的详细信息
 *
 * 注意：由于抓取脚本使用 Playwright（需要浏览器），
 * 实际部署时需要在服务器上运行抓取脚本或使用外部 API。
 */

// 模拟数据缓存（实际项目中应从数据库或抓取服务获取）
const videoCache = new Map();

/**
 * 抓取视频元数据
 * 注意：这是简化版本，实际部署时需要调用外部抓取服务
 * @param {string} videoId - 视频 ID
 * @returns {Promise<Object>} 视频详情
 */
async function scrapeVideoMetadata(videoId: string) {
  // 由于 Playwright 不能在 Next.js API 中直接运行，
  // 实际部署时需要：
  // 1. 在独立服务器上运行抓取脚本
  // 2. 使用 Cloudflare Worker 或其他后端服务
  // 3. 从数据库缓存中获取已抓取的数据

  // 这里返回模拟数据结构
  return {
    id: videoId,
    title: `视频标题 ${videoId}`,
    description: '这是视频的详细描述，介绍视频的内容和背景信息。',
    duration: '12:34',
    views: '1.2M',
    publishDate: '2024-01-15',
    coverUrl: `https://via.placeholder.com/1280x720/333/fff?text=Video+${videoId}`,
    author: {
      name: '频道1',
      avatarUrl: 'https://via.placeholder.com/60x60/666/fff?text=CH',
      url: '#'
    },
    tags: ['标签1', '标签2', '标签3'],
    category: '分类名称',
    sourceUrl: `https://jable.tv/videos/${videoId}/`,
    scrapedAt: new Date().toISOString()
  };
}

/**
 * GET /api/videos/[id]
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  if (!videoId) {
    return NextResponse.json(
      { error: '缺少视频 ID' },
      { status: 400 }
    );
  }

  try {
    // 检查缓存
    let video = videoCache.get(videoId);
    const cacheTime = videoCache.get(`${videoId}_time`);

    // 缓存 1 小时
    if (!video || (cacheTime && Date.now() - cacheTime > 3600000)) {
      // 重新获取（实际项目中调用抓取服务）
      video = await scrapeVideoMetadata(videoId);
      videoCache.set(videoId, video);
      videoCache.set(`${videoId}_time`, Date.now());
    }

    // 返回视频详情
    return NextResponse.json({
      success: true,
      data: {
        ...video,
        // 播放相关：使用 Worker 代理的 m3u8 URL
        streamUrl: `https://jable-video-proxy.qh13.workers.dev/${videoId}.m3u8`,
        // poster 图片
        poster: video.coverUrl
      }
    });

  } catch (error) {
    console.error(`Error fetching video ${videoId}:`, error);

    return NextResponse.json(
      {
        error: '获取视频信息失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 清理缓存的 API（可选）
 * DELETE /api/videos/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  videoCache.delete(videoId);
  videoCache.delete(`${videoId}_time`);

  return NextResponse.json({
    success: true,
    message: `已清理视频 ${videoId} 的缓存`
  });
}
