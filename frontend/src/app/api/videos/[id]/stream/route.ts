/**
 * 视频流 API - 获取真实的 m3u8 URL
 *
 * GET /api/videos/[id]/stream
 * 获取指定视频的真实流媒体 URL（从第三方 CDN）
 */

import { NextResponse } from 'next/server';

// 模拟数据缓存
const streamCache = new Map();

/**
 * 从 jable.tv 页面提取视频流 URL
 * 注意：实际部署时需要使用 Playwright 或 Puppeteer 等工具
 * 这里返回模拟数据格式
 *
 * @param {string} videoId - jable.tv 视频 ID (如 dldss-460)
 * @returns {Promise<Object>} 视频流信息
 */
async function extractStreamUrl(videoId: string) {
  // 由于无法直接在 API 路由中运行 Playwright，
  // 实际部署时需要：
  // 1. 使用外部抓取服务
  // 2. 使用 Cloudflare Worker 抓取
  // 3. 从数据库获取已缓存的数据

  // 这里返回已知的 CDN URL 格式作为参考
  // 实际使用时需要通过抓取获取真实的 token 和路径

  return {
    success: true,
    data: {
      videoId: videoId,
      streamUrl: `https://akuma-trstin.mushroomtrack.com/hls/{token}/{timestamp}/56000/{internalId}/${videoId}.m3u8`,
      // 备用 CDN
      backupUrls: [
        `https://edge-hls.saawsedge.com/hls/${videoId}/master/${videoId}_240p.m3u8`,
        `https://media-hls.saawsedge.com/b-hls-03/${videoId}/${videoId}_240p.m3u8`
      ],
      formats: {
        '240p': `${videoId}_240p.m3u8`,
        '480p': `${videoId}_480p.m3u8`,
        '720p': `${videoId}_720p.m3u8`,
        '1080p': `${videoId}_1080p.m3u8`
      },
      note: '需要通过抓取脚本获取真实的 CDN URL'
    }
  };
}

/**
 * 获取视频流信息的缓存键
 */
function getCacheKey(videoId: string) {
  return `stream_${videoId}`;
}

/**
 * GET /api/videos/[id]/stream
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
    // 检查缓存（缓存 10 分钟）
    const cacheKey = getCacheKey(videoId);
    const cached = streamCache.get(cacheKey);
    const cacheTime = streamCache.get(`${cacheKey}_time`);

    if (cached && cacheTime && Date.now() - cacheTime < 600000) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // 获取视频流信息
    const streamInfo = await extractStreamUrl(videoId);

    if (streamInfo.success) {
      streamCache.set(cacheKey, streamInfo.data);
      streamCache.set(`${cacheKey}_time`, Date.now());
    }

    return NextResponse.json(streamInfo);

  } catch (error) {
    console.error(`Error fetching stream for ${videoId}:`, error);

    return NextResponse.json(
      {
        error: '获取视频流信息失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 清理缓存
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;
  const cacheKey = getCacheKey(videoId);

  streamCache.delete(cacheKey);
  streamCache.delete(`${cacheKey}_time`);

  return NextResponse.json({
    success: true,
    message: `已清理视频 ${videoId} 的流信息缓存`
  });
}
