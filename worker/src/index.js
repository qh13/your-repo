/**
 * Cloudflare Worker - jable.tv 视频代理 + D1 数据库 API v5
 *
 * 功能：
 * 1. KV 缓存热点视频 URL 映射
 * 2. 代理 m3u8 播放列表（短期缓存）
 * 3. 代理视频分片（长期缓存）
 * 4. Range 请求支持（视频拖拽）
 * 5. 完整的防盗链处理
 * 6. D1 数据库 API（视频 CRUD）
 * 7. Workers Cron 定时任务支持
 */

// 配置
const ORIGIN_DOMAIN = 'jable.tv';
const WORKER_URL = 'https://jable-video-proxy.qh13.workers.dev';

// 缓存配置
const CACHE_CONFIG = {
  m3u8: {
    maxAge: 3, // 秒 - m3u8 短期缓存
    cacheKey: 'm3u8-cache'
  },
  ts: {
    maxAge: 31536000, // 1年 - 视频分片长期缓存
    cacheKey: 'ts-cache'
  },
  api: {
    maxAge: 60, // 60秒 - API 缓存
    cacheKey: 'api-cache'
  }
};

// ============= KV 缓存操作 =============

/**
 * KV 缓存配置
 */
const KV_CACHE_TTL = 3600; // 1小时 - KV 缓存 TTL

/**
 * 从 KV 缓存获取视频详情
 * @param {Object} env - 环境变量
 * @param {string} videoId - 视频 ID
 */
async function getVideoFromKV(env, videoId) {
  try {
    const cached = await env.VIDEO_CACHE.get(`video:${videoId}`);
    if (cached) {
      console.log(`[KV HIT] video:${videoId}`);
      return JSON.parse(cached);
    }
    console.log(`[KV MISS] video:${videoId}`);
    return null;
  } catch (error) {
    console.error('[KV ERROR]', error.message);
    return null;
  }
}

/**
 * 将视频详情保存到 KV 缓存
 * @param {Object} env - 环境变量
 * @param {string} videoId - 视频 ID
 * @param {Object} videoData - 视频数据
 */
async function setVideoToKV(env, videoId, videoData) {
  try {
    // 只缓存热点数据的关键字段
    const cacheData = {
      id: videoData.id,
      title: videoData.title,
      coverUrl: videoData.coverUrl,
      streamUrl: videoData.streamUrl,
      streamPrimaryUrl: videoData.streamPrimaryUrl,
      duration: videoData.duration,
      authorName: videoData.authorName,
      cachedAt: new Date().toISOString()
    };
    
    await env.VIDEO_CACHE.put(
      `video:${videoId}`,
      JSON.stringify(cacheData),
      { expirationTtl: KV_CACHE_TTL }
    );
    console.log(`[KV SET] video:${videoId}, TTL:${KV_CACHE_TTL}s`);
  } catch (error) {
    console.error('[KV SET ERROR]', error.message);
  }
}

/**
 * 批量预热 KV 缓存（从 D1 读取热门视频）
 * @param {Object} env - 环境变量
 */
async function warmUpKVCache(env) {
  try {
    console.log('[CRON] 开始 KV 缓存预热...');
    
    // 获取热门视频
    const hotVideos = await env.DB.prepare(`
      SELECT id, title, cover_url, stream_primary_url, duration, author_name
      FROM videos
      ORDER BY view_count DESC
      LIMIT 100
    `).all();
    
    let cached = 0;
    for (const video of hotVideos.results) {
      await setVideoToKV(env, video.id, {
        id: video.id,
        title: video.title,
        coverUrl: video.cover_url,
        streamUrl: video.stream_primary_url,
        streamPrimaryUrl: video.stream_primary_url,
        duration: video.duration,
        authorName: video.author_name
      });
      cached++;
    }
    
    console.log(`[CRON] KV 缓存预热完成: ${cached} 个视频`);
    return { success: true, cached };
  } catch (error) {
    console.error('[CRON] KV 缓存预热失败:', error.message);
    return { success: false, error: error.message };
  }
}

// ============= 数据库操作 =============

/**
 * 从缓存获取响应
 * @param {string} cacheKey - 缓存键
 * @param {Request} request - 请求对象
 */
async function getFromCache(cacheKey, request) {
  const cache = caches.default;
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // 检查缓存是否过期
    const dateHeader = cachedResponse.headers.get('Date');
    if (dateHeader) {
      const cachedTime = new Date(dateHeader).getTime();
      const now = Date.now();
      const maxAge = CACHE_CONFIG[cacheKey]?.maxAge || 60;
      
      if (now - cachedTime < maxAge * 1000) {
        return cachedResponse;
      }
    }
  }
  
  return null;
}

/**
 * 保存响应到缓存
 * @param {string} cacheKey - 缓存键
 * @param {Request} request - 请求对象
 * @param {Response} response - 响应对象
 */
async function saveToCache(cacheKey, request, response) {
  const cache = caches.default;
  const maxAge = CACHE_CONFIG[cacheKey]?.maxAge || 60;
  
  // 克隆响应以避免修改原始响应
  const responseToCache = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });
  
  // 更新缓存控制头
  responseToCache.headers.set('Cache-Control', `public, max-age=${maxAge}`);
  responseToCache.headers.set('X-Cache-Status', 'MISS');
  
  // 保存到缓存
  await cache.put(request, responseToCache);
  
  return responseToCache;
}

/**
 * 获取缓存状态
 */
function getCacheStatus(request) {
  return caches.default.match(request).then(response => {
    if (response) {
      return response.headers.get('X-Cache-Status') || 'HIT';
    }
    return 'MISS';
  });
}

// ============= 数据库操作 =============

/**
 * 查询视频列表
 * @param {Object} env - 环境变量
 * @param {Object} params - 查询参数
 */
async function getVideoList(env, params = {}) {
  const {
    page = 1,
    limit = 20,
    category = null,
    search = null
  } = params;
  const offset = (page - 1) * limit;
  
  let conditions = [];
  let queryParams = [];
  
  if (category && category !== 'all' && category !== 'uncategorized') {
    conditions.push('v.category = ?');
    queryParams.push(category);
  }
  
  if (search) {
    conditions.push('(v.title LIKE ? OR v.description LIKE ?)');
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm);
  }
  
  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';
  
  const videosQuery = `
    SELECT v.id, v.title, v.description, v.duration, v.views, v.publish_date,
           v.cover_url, v.category, v.author_name, v.tags, v.scraped_at, v.view_count,
           c.name as category_name
    FROM videos v
    LEFT JOIN categories c ON v.category = c.slug
    ${whereClause}
    ORDER BY v.scraped_at DESC
    LIMIT ? OFFSET ?
  `;
  
  queryParams.push(limit.toString(), offset.toString());
  
  const countQuery = `
    SELECT COUNT(*) as total FROM videos v
    ${whereClause}
  `;
  
  try {
    const videos = await env.DB.prepare(videosQuery)
      .bind(...queryParams)
      .all();
    
    const countResult = await env.DB.prepare(countQuery)
      .bind(...queryParams.slice(0, -2))
      .first();
    
    return {
      success: true,
      data: {
        videos: videos.results.map(formatVideoForApi),
        pagination: {
          page,
          limit,
          total: countResult?.total || 0,
          totalPages: Math.ceil((countResult?.total || 0) / limit)
        }
      }
    };
  } catch (error) {
    console.error('getVideoList error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 查询单个视频
 * @param {Object} env - 环境变量
 * @param {string} videoId - 视频 ID
 */
async function getVideoDetail(env, videoId) {
  try {
    const stmt = env.DB.prepare(`
      SELECT v.*, c.name as category_name
      FROM videos v
      LEFT JOIN categories c ON v.category = c.slug
      WHERE v.id = ?
    `);
    
    const result = await stmt.bind(videoId).first();
    
    if (!result) {
      return { success: false, error: 'Video not found', errorCode: 'NOT_FOUND' };
    }
    
    // 增加浏览次数
    await env.DB.prepare(`
      UPDATE videos SET view_count = view_count + 1 WHERE id = ?
    `).bind(videoId).run();
    
    // 使用数据库中的原始 stream_url，如果存在且是外部 URL
    let streamUrl;
    if (result.stream_primary_url && result.stream_primary_url.startsWith('http')) {
      // 外部 URL，直接使用
      streamUrl = result.stream_primary_url;
    } else {
      // 代理 URL
      streamUrl = `${WORKER_URL}/${videoId}.m3u8`;
    }
    
    const tags = result.tags ? JSON.parse(result.tags) : [];
    const streamBackupUrls = result.stream_backup_urls 
      ? JSON.parse(result.stream_backup_urls) 
      : [];
    const streamQualities = result.stream_qualities 
      ? JSON.parse(result.stream_qualities) 
      : {};
    
    return {
      success: true,
      data: {
        ...formatVideoForApi(result),
        streamUrl,
        streamBackupUrls,
        streamQualities,
        tags
      }
    };
  } catch (error) {
    console.error('getVideoDetail error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 搜索视频
 */
async function searchVideos(env, keyword) {
  return getVideoList(env, { search: keyword, limit: 50 });
}

/**
 * 获取热门视频
 */
async function getHotVideos(env, limit = 10) {
  try {
    const stmt = env.DB.prepare(`
      SELECT id, title, description, duration, views, cover_url, 
             category, author_name, scraped_at, view_count
      FROM videos
      ORDER BY view_count DESC
      LIMIT ?
    `);
    
    const result = await stmt.bind(limit.toString()).all();
    
    return {
      success: true,
      data: {
        videos: result.results.map(formatVideoForApi)
      }
    };
  } catch (error) {
    console.error('getHotVideos error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取所有分类
 */
async function getCategories(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT c.*, COUNT(v.id) as video_count
      FROM categories c
      LEFT JOIN videos v ON v.category = c.slug
      GROUP BY c.slug
      ORDER BY video_count DESC
    `).all();
    
    return {
      success: true,
      data: {
        categories: result.results.map(cat => ({
          slug: cat.slug,
          name: cat.name,
          description: cat.description,
          videoCount: cat.video_count || 0
        }))
      }
    };
  } catch (error) {
    console.error('getCategories error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取统计信息
 */
async function getStats(env) {
  try {
    const totalResult = await env.DB.prepare('SELECT COUNT(*) as total FROM videos').first();
    const viewResult = await env.DB.prepare('SELECT SUM(view_count) as total FROM videos').first();
    const categoryResult = await env.DB.prepare('SELECT COUNT(DISTINCT category) as total FROM videos').first();
    
    return {
      success: true,
      data: {
        totalVideos: totalResult?.total || 0,
        totalViews: viewResult?.total || 0,
        totalCategories: categoryResult?.total || 0
      }
    };
  } catch (error) {
    console.error('getStats error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 保存视频到数据库
 */
async function saveVideo(env, video) {
  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM videos WHERE id = ?'
    ).bind(video.id).first();
    
    const now = new Date().toISOString();
    
    if (existing) {
      await env.DB.prepare(`
        UPDATE videos SET
          title = ?, description = ?, duration = ?, views = ?,
          cover_url = ?, category = ?, author_name = ?, author_avatar_url = ?,
          tags = ?, stream_primary_url = ?, stream_backup_urls = ?,
          stream_qualities = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        video.title, video.description || null, video.duration || null, video.views || null,
        video.coverUrl || null, video.category || 'uncategorized',
        video.author?.name || null, video.author?.avatarUrl || null,
        JSON.stringify(video.tags || []),
        video.streamUrls?.primary || null,
        JSON.stringify(video.streamUrls?.backups || []),
        JSON.stringify(video.streamUrls?.qualities || {}),
        now, video.id
      ).run();
      
      return { success: true, action: 'updated', id: video.id };
    } else {
      await env.DB.prepare(`
        INSERT INTO videos (
          id, title, description, duration, views, publish_date,
          cover_url, thumbnail_url, source_url, category,
          author_name, author_avatar_url, tags,
          stream_primary_url, stream_backup_urls, stream_qualities,
          scraped_at, updated_at, view_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).bind(
        video.id, video.title, video.description || null, video.duration || null,
        video.views || null, video.publishDate || null,
        video.coverUrl || null, video.thumbnailUrl || null,
        video.sourceUrl || null, video.category || 'uncategorized',
        video.author?.name || null, video.author?.avatarUrl || null,
        JSON.stringify(video.tags || []),
        video.streamUrls?.primary || null,
        JSON.stringify(video.streamUrls?.backups || []),
        JSON.stringify(video.streamUrls?.qualities || {}),
        now, now
      ).run();
      
      return { success: true, action: 'created', id: video.id };
    }
  } catch (error) {
    console.error('saveVideo error:', error);
    return { success: false, error: error.message, id: video.id };
  }
}

/**
 * 批量保存视频
 */
async function saveVideosBatch(env, videos) {
  const results = { success: true, saved: 0, failed: 0, errors: [] };
  
  for (const video of videos) {
    const result = await saveVideo(env, video);
    if (result.success) {
      results.saved++;
    } else {
      results.failed++;
      results.errors.push(`${video.id}: ${result.error}`);
    }
  }
  
  return results;
}

/**
 * 格式化视频数据用于 API 输出
 */
function formatVideoForApi(video) {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    duration: video.duration,
    views: video.views,
    publishDate: video.publish_date,
    coverUrl: video.cover_url,
    category: video.category,
    categoryName: video.category_name,
    authorName: video.author_name,
    tags: video.tags ? JSON.parse(video.tags) : [],
    scrapedAt: video.scraped_at,
    viewCount: video.view_count
  };
}

// ============= 视频代理功能 =============

/**
 * 从 URL 中提取视频 ID
 */
function extractVideoId(pathname) {
  const match = pathname.match(/\/([a-zA-Z0-9_-]+)\.m3u8$/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * 重写 m3u8 文件中的分片 URL
 */
function rewriteManifestUrls(manifest, videoId) {
  let rewritten = manifest;
  
  rewritten = rewritten.replace(
    /^(?!#)([^"\s]*(?:\.ts))/gm,
    `https://${ORIGIN_DOMAIN}/videos/${videoId}/$1`
  );
  
  rewritten = rewritten.replace(
    /^(?!#)([^"\s]*(?:\.m3u8))/gm,
    `https://${ORIGIN_DOMAIN}/videos/${videoId}/$1`
  );
  
  rewritten = rewritten.replace(
    /^(?!#)([^"\s]*(?:\.key))/gm,
    `https://${ORIGIN_DOMAIN}/videos/${videoId}/$1`
  );
  
  rewritten = rewritten.replace(
    /^(?!#)([^"\s]*(?:\.vtt|\.srt))/gm,
    `https://${ORIGIN_DOMAIN}/videos/${videoId}/$1`
  );
  
  return rewritten;
}

/**
 * 获取 Range 头
 */
function getRangeHeader(request) {
  return request.headers.get('Range');
}

/**
 * 解析 Range 头
 */
function parseRange(range) {
  if (!range) return null;
  
  const match = range.match(/^bytes=(\d+)-(\d*)$/);
  if (match) {
    return {
      start: parseInt(match[1], 10),
      end: match[2] ? parseInt(match[2], 10) : undefined
    };
  }
  return null;
}

/**
 * 构建发送给 jable.tv 的请求头
 */
function buildOriginHeaders(request) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': `https://${ORIGIN_DOMAIN}/`,
    'Origin': `https://${ORIGIN_DOMAIN}`,
  };
  
  const range = getRangeHeader(request);
  if (range) {
    headers['Range'] = range;
  }
  
  const copyHeaders = ['Cookie', 'Accept-Encoding'];
  for (const header of copyHeaders) {
    if (request.headers.has(header)) {
      headers[header] = request.headers.get(header);
    }
  }
  
  return headers;
}

/**
 * 处理 Range 请求
 */
async function handleRangeRequest(request, originResponse, videoId, segmentPath) {
  const range = getRangeHeader(request);
  if (!range) {
    return originResponse;
  }
  
  const parsedRange = parseRange(range);
  if (!parsedRange) {
    return new Response('Invalid Range header', {
      status: 416,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes'
      }
    });
  }
  
  const originUrl = `https://${ORIGIN_DOMAIN}/videos/${videoId}/${segmentPath}`;
  const originReq = await fetch(originUrl, {
    headers: buildOriginHeaders(request)
  });
  
  if (!originReq.ok) {
    return new Response('Failed to fetch segment', {
      status: originReq.status,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
  
  const contentLength = originReq.headers.get('Content-Length');
  const totalSize = parseInt(contentLength || '0', 10);
  
  let start = parsedRange.start;
  let end = parsedRange.end !== undefined ? parsedRange.end : totalSize - 1;
  
  if (start >= totalSize) {
    return new Response('Range Not Satisfiable', {
      status: 416,
      headers: {
        'Content-Range': `bytes */${totalSize}`,
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes'
      }
    });
  }
  
  if (end >= totalSize) {
    end = totalSize - 1;
  }
  
  const rangeUrl = `${originUrl}?range=bytes=${start}-${end}`;
  const rangeReq = await fetch(rangeUrl, {
    headers: {
      ...buildOriginHeaders(request),
      'Range': `bytes=${start}-${end}`
    }
  });
  
  const rangeData = await rangeReq.arrayBuffer();
  const contentRange = `bytes ${start}-${end}/${totalSize}`;
  
  return new Response(rangeData, {
    status: 206,
    headers: {
      'Content-Type': 'video/mp2t',
      'Content-Length': rangeData.byteLength.toString(),
      'Content-Range': contentRange,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range'
    }
  });
}

/**
 * 处理 .ts 分片请求（使用缓存）
 */
async function handleSegmentRequest(request, videoId, segmentPath) {
  // 尝试从缓存获取
  const cached = await getFromCache('ts', request);
  if (cached) {
    cached.headers.set('X-Cache-Status', 'HIT');
    return cached;
  }
  
  const originUrl = `https://${ORIGIN_DOMAIN}/videos/${videoId}/${segmentPath}`;
  
  try {
    const originResponse = await fetch(originUrl, {
      method: 'GET',
      headers: buildOriginHeaders(request)
    });
    
    if (!originResponse.ok) {
      return new Response(`Segment not found: ${originResponse.status}`, {
        status: originResponse.status,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    const range = getRangeHeader(request);
    if (range) {
      return handleRangeRequest(request, originResponse, videoId, segmentPath);
    }
    
    // 创建可缓存的响应
    const response = new Response(originResponse.body, {
      status: originResponse.status,
      headers: {
        'Content-Type': 'video/mp2t',
        'Content-Length': originResponse.headers.get('Content-Length') || '',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      }
    });
    
    // 异步保存到缓存
    saveToCache('ts', request, response);
    
    return response;
  } catch (error) {
    return new Response(`Error fetching segment: ${error.message}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

/**
 * 处理 .m3u8 播放列表请求（短期缓存）
 */
async function handleM3u8Request(request, videoId) {
  // 尝试从缓存获取
  const cached = await getFromCache('m3u8', request);
  if (cached) {
    cached.headers.set('X-Cache-Status', 'HIT');
    return cached;
  }
  
  const originUrl = `https://${ORIGIN_DOMAIN}/videos/${videoId}/index.m3u8`;
  
  try {
    const originResponse = await fetch(originUrl, {
      method: 'GET',
      headers: buildOriginHeaders(request)
    });
    
    if (!originResponse.ok) {
      return new Response(`Failed to fetch m3u8: ${originResponse.status}`, {
        status: originResponse.status,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    const manifest = await originResponse.text();
    const rewrittenManifest = rewriteManifestUrls(manifest, videoId);
    
    const response = new Response(rewrittenManifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Content-Length': Buffer.byteLength(rewrittenManifest),
        'Access-Control-Allow-Origin': '*',
      }
    });
    
    // 异步保存到缓存
    saveToCache('m3u8', request, response);
    
    return response;
  } catch (error) {
    return new Response(`Error fetching m3u8: ${error.message}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

/**
 * 处理视频详情页面请求
 */
async function handleVideoPageRequest(request, videoId, env) {
  const ORIGIN_DOMAIN = 'jable.tv';
  
  try {
    // 获取视频详情
    const response = await env.DB.prepare(`
      SELECT v.*, c.name as category_name
      FROM videos v
      LEFT JOIN categories c ON v.category = c.slug
      WHERE v.id = ?
    `).bind(videoId).first();
    
    if (!response) {
      return new Response(
        generateVideoPageHTML(null, videoId, null),
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
    
    // 增加浏览次数
    await env.DB.prepare(`
      UPDATE videos SET view_count = view_count + 1 WHERE id = ?
    `).bind(videoId).run();
    
    // 构建 stream URL
    let streamUrl;
    if (response.stream_primary_url && response.stream_primary_url.startsWith('http')) {
      streamUrl = response.stream_primary_url;
    } else {
      streamUrl = `https://jable-video-proxy.qh13.workers.dev/${videoId}.m3u8`;
    }
    
    const tags = response.tags ? JSON.parse(response.tags) : [];
    
    const videoData = {
      id: response.id,
      title: response.title,
      description: response.description,
      duration: response.duration,
      views: response.views,
      publishDate: response.publish_date,
      coverUrl: response.cover_url,
      authorName: response.author_name,
      tags,
      streamUrl,
    };
    
    return new Response(
      generateVideoPageHTML(videoData, videoId, null),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
    
  } catch (error) {
    console.error('Video page error:', error);
    return new Response(
      generateVideoPageHTML(null, videoId, error.message),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}

/**
 * 生成视频页面 HTML
 */
function generateVideoPageHTML(video, videoId, errorMessage) {
  if (errorMessage) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>视频未找到 - 视频聚合平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      color: #fff;
      text-decoration: none;
    }
    .error-container {
      text-align: center;
      padding: 40px;
    }
    .error-code {
      font-size: 6rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 16px;
    }
    .error-title {
      font-size: 2rem;
      margin-bottom: 16px;
    }
    .back-link {
      display: inline-block;
      padding: 12px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <header class="header">
    <a href="/" class="logo">视频聚合</a>
  </header>
  <div class="error-container">
    <div class="error-code">500</div>
    <h1 class="error-title">服务器错误</h1>
    <p style="margin-bottom: 24px; color: rgba(255,255,255,0.6);">${escapeHTML(errorMessage)}</p>
    <a href="/" class="back-link">返回首页</a>
  </div>
</body>
</html>`;
  }
  
  if (!video) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>视频未找到 - 视频聚合平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      color: #fff;
      text-decoration: none;
    }
    .error-container {
      text-align: center;
      padding: 40px;
    }
    .error-code {
      font-size: 6rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 16px;
    }
    .back-link {
      display: inline-block;
      padding: 12px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <header class="header">
    <a href="/" class="logo">视频聚合</a>
  </header>
  <div class="error-container">
    <div class="error-code">404</div>
    <h1 style="font-size: 2rem; margin-bottom: 16px;">视频未找到</h1>
    <a href="/" class="back-link">返回首页</a>
  </div>
</body>
</html>`;
  }
  
  const authorName = video.authorName || '未知作者';
  let tagsHTML = '';
  if (video.tags && video.tags.length > 0) {
    tagsHTML = `
      <div class="tags">
        ${video.tags.map(tag => 
          `<a href="/search?q=${encodeURIComponent(tag)}" class="tag">${escapeHTML(tag)}</a>`
        ).join('')}
      </div>
    `;
  }
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(video.title)} - 视频聚合平台</title>
  <meta name="description" content="${escapeHTML(video.description || '')}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
    }
    .header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      color: #fff;
      text-decoration: none;
    }
    .nav {
      display: flex;
      gap: 20px;
    }
    .nav a {
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      font-size: 0.95rem;
    }
    .nav a:hover { color: #fff; }
    .player-wrapper {
      aspect-ratio: 16/9;
      max-height: 70vh;
      background: #000;
    }
    .video-info {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    .video-info h1 {
      font-size: 1.5rem;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    .video-stats {
      display: flex;
      gap: 16px;
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
      margin-bottom: 20px;
    }
    .author {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .author-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }
    .description {
      color: rgba(255,255,255,0.7);
      line-height: 1.8;
      margin-bottom: 20px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .tag {
      padding: 4px 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
    }
    .source-link {
      color: rgba(255,255,255,0.5);
      font-size: 0.9rem;
    }
    .source-link a {
      color: #4da6ff;
    }
    .back-link {
      display: inline-block;
      margin: 24px;
      padding: 10px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <header class="header">
    <a href="/" class="logo">视频聚合</a>
    <nav class="nav">
      <a href="/">首页</a>
      <a href="/category/recent">最新</a>
      <a href="/hot">热门</a>
      <a href="/search">搜索</a>
      <a href="/about">关于</a>
    </nav>
  </header>
  <main>
    <div class="player-wrapper">
      ${video.streamUrl ? 
        `<video controls poster="${escapeHTML(video.coverUrl)}" playsinline>
          <source src="${escapeHTML(video.streamUrl)}" type="application/x-mpegURL">
          您的浏览器不支持视频播放
        </video>` : 
        `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;">视频加载中... (ID: ${escapeHTML(videoId)})</div>`
      }
    </div>
    <div class="video-info">
      <h1>${escapeHTML(video.title)}</h1>
      <div class="video-stats">
        <span>${escapeHTML(video.views || '0')} 次观看</span>
        <span>${escapeHTML(video.duration || '--:--')}</span>
        <span>${escapeHTML(video.publishDate || '')}</span>
      </div>
      <div class="author">
        <div class="author-avatar">${escapeHTML(authorName.charAt(0))}</div>
        <div>
          <div style="font-weight:500;">${escapeHTML(authorName)}</div>
          <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);">上传者</div>
        </div>
      </div>
      ${video.description ? `<p class="description">${escapeHTML(video.description)}</p>` : ''}
      ${tagsHTML}
      <div class="source-link">
        来源：<a href="https://jable.tv/videos/${escapeHTML(videoId)}/" target="_blank">jable.tv</a>
      </div>
    </div>
    <a href="/" class="back-link">返回首页</a>
  </main>
</body>
</html>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 处理请求路由
 */
// 导入页面渲染模块
const { renderHomePage, renderSearchPage, renderVideoPage } = require('./pages');

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // API 路由
  if (pathname.startsWith('/api/')) {
    return handleApiRequest(request, env);
  }
  
  // 首页路由 - SSR 渲染（直接查询 D1，不调用自身 API）
  if (pathname === '/' || pathname === '/index.html') {
    try {
      // 直接从 D1 获取数据，避免 HTTP 循环调用
      const [videosResult, statsResult] = await Promise.all([
        getVideoList(env, { page: 1, limit: 24 }),
        getStats(env)
      ]);

      const videos = videosResult.success ? videosResult.data.videos : [];
      const stats = statsResult.success ? statsResult.data : {};

      const html = renderHomePage(videos, stats);

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } catch (error) {
      console.error('Home page error:', error);
      const html = renderHomePage([], {});
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  }
  
  // 搜索页路由 - SSR 渲染
  if (pathname === '/search') {
    const keyword = url.searchParams.get('q') || url.searchParams.get('keyword') || '';
    
    try {
      let videos = [];
      let stats = {};
      
      if (keyword) {
        const [searchRes, statsRes] = await Promise.all([
          fetch(`${WORKER_URL}/api/search?q=${encodeURIComponent(keyword)}&limit=50`, {
            headers: { 'Accept': 'application/json' }
          }),
          fetch(`${WORKER_URL}/api/stats`, {
            headers: { 'Accept': 'application/json' }
          })
        ]);
        
        const searchData = await searchRes.json();
        const statsData = await statsRes.json();
        
        videos = searchData.success ? searchData.data.videos : [];
        stats = statsData.success ? statsData.data : {};
      }
      
      const html = renderSearchPage(keyword, videos, stats);
      
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    } catch (error) {
      console.error('Search page error:', error);
      const html = renderSearchPage(keyword, [], {});
      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  }
  
  // 视频详情页面路由 - SSR 渲染
  const videoPageMatch = pathname.match(/^\/videos\/([^\/]+)$/);
  if (videoPageMatch) {
    const videoId = videoPageMatch[1];
    const result = await getVideoDetail(env, videoId);
    
    if (!result.success) {
      const html = renderVideoPage(null, videoId, result.errorCode || 'NOT_FOUND');
      return new Response(html, {
        status: result.errorCode === 'NOT_FOUND' ? 404 : 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    const html = renderVideoPage(result.data, videoId);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  // 提取视频 ID
  const videoId = extractVideoId(pathname);
  
  if (!videoId) {
    return new Response('Invalid video ID', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
  
  // 处理 .ts 分片请求
  if (pathname.endsWith('.ts')) {
    const segmentMatch = pathname.match(/\/videos\/[^\/]+\/(.+)$/);
    const segmentPath = segmentMatch ? segmentMatch[1] : pathname;
    return handleSegmentRequest(request, videoId, segmentPath);
  }
  
  // 处理 .m3u8 播放列表请求
  if (pathname.endsWith('.m3u8')) {
    return handleM3u8Request(request, videoId);
  }
  
  // 其他文件请求
  if (pathname.match(/\.(key|vtt|srt)$/)) {
    const segmentMatch = pathname.match(/\/videos\/[^\/]+\/(.+)$/);
    const segmentPath = segmentMatch ? segmentMatch[1] : pathname;
    return handleSegmentRequest(request, videoId, segmentPath);
  }
  
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

/**
 * 处理 API 请求
 */
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // POST: 保存视频
  if (request.method === 'POST' && pathname === '/api/admin/save-video') {
    try {
      const video = await request.json();
      
      if (!video || !video.id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid video data: missing id' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      const result = await saveVideo(env, video);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    } catch (error) {
      console.error('save-video API error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
  
  // POST: 批量保存视频
  if (request.method === 'POST' && pathname === '/api/admin/save-videos') {
    try {
      const { videos } = await request.json();
      
      if (!Array.isArray(videos) || videos.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid videos data' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      
      const result = await saveVideosBatch(env, videos);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    } catch (error) {
      console.error('save-videos API error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
  
  // 只允许 GET 请求
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }
  
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    
    // API 路由匹配
    if (pathname === '/api/videos') {
      const result = await getVideoList(env, { page, limit, category, search });
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    
    if (pathname.startsWith('/api/videos/')) {
      const videoId = pathname.split('/').pop();
      const result = await getVideoDetail(env, videoId);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    
    if (pathname === '/api/search') {
      const keyword = url.searchParams.get('q') || url.searchParams.get('keyword');
      if (!keyword) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing keyword' 
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      const result = await searchVideos(env, keyword);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    
    if (pathname === '/api/hot') {
      const result = await getHotVideos(env, limit);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    
    if (pathname === '/api/categories') {
      const result = await getCategories(env);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    
    if (pathname === '/api/stats') {
      const result = await getStats(env);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    
    // 未知 API
    return new Response(JSON.stringify({ error: 'API not found' }), {
      status: 404,
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// ============= 主入口 =============

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    if (request.method !== 'GET' && !request.url.includes('/api/admin')) {
      return new Response('Method not allowed', {
        status: 405,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error(`Worker error: ${error.message}`);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
};
