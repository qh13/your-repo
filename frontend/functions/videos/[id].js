/**
 * Cloudflare Pages Function - 视频详情页动态路由
 * 处理 /videos/{id} 路径，返回视频详情数据
 * 
 * 注意：此函数使用 Cloudflare Pages 原生运行时，不依赖 Next.js
 */

// API 基础地址 - 从环境变量获取（Cloudflare Pages 使用 context.vars）
function getApiBaseUrl(context) {
  // Cloudflare Pages 环境变量通过 context.vars 访问
  if (context.vars && context.vars.NEXT_PUBLIC_API_URL) {
    return context.vars.NEXT_PUBLIC_API_URL;
  }
  // 回退到 Cloudflare Worker 默认地址
  return 'https://jable-video-proxy.qh13.workers.dev';
}

async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  // 获取 API 基础地址
  const API_BASE_URL = getApiBaseUrl(context);
  
  // 匹配 /videos/{id} 路径
  const match = pathname.match(/^\/videos\/([^\/]+)$/);
  if (!match) {
    return new Response('Not Found', { status: 404 });
  }
  
  const videoId = match[1];
  
  try {
    // 获取视频详情
    const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      return new Response(
        generateErrorHTML(videoId, '视频未找到'),
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
    
    const videoData = await response.json();
    
    if (!videoData.success || !videoData.data) {
      return new Response(
        generateErrorHTML(videoId, '视频数据不存在'),
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
    
    const video = videoData.data;
    
    // 生成视频详情页 HTML
    const html = generateVideoHTML(video, videoId, API_BASE_URL);
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60', // 缓存 60 秒
      },
    });
    
  } catch (error) {
    console.error('Video page error:', error);
    return new Response(
      generateErrorHTML(videoId, error.message),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}

function generateVideoHTML(video, videoId, apiBaseUrl) {
  const streamUrl = video.streamUrl || `${apiBaseUrl}/${videoId}.m3u8`;
  const authorName = video.authorName || '未知作者';
  
  // 生成标签 HTML
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
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
      transition: color 0.2s;
    }
    .nav a:hover { color: #fff; }
    
    .player-wrapper {
      aspect-ratio: 16/9;
      max-height: 70vh;
      max-width: 1200px;
      margin: 0 auto;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .player-wrapper video,
    .player-wrapper iframe {
      width: 100%;
      height: 100%;
      max-width: 1200px;
      margin: 0 auto;
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
    .author-name {
      font-weight: 500;
    }
    .author-label {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.5);
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
    .tag:hover {
      background: rgba(255,255,255,0.2);
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
    .loading {
      color: rgba(255,255,255,0.7);
      text-align: center;
      padding: 100px 0;
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
          <source src="${escapeHTML(streamUrl)}" type="application/x-mpegURL">
          您的浏览器不支持视频播放
        </video>` : 
        `<div class="loading">视频加载中... (ID: ${escapeHTML(videoId)})</div>`
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
          <div class="author-name">${escapeHTML(authorName)}</div>
          <div class="author-label">上传者</div>
        </div>
      </div>
      
      ${video.description ? `<p class="description">${escapeHTML(video.description)}</p>` : ''}
      
      ${tagsHTML}
    </div>
    
    <a href="/" class="back-link">返回首页</a>
  </main>
</body>
</html>`;
}

function generateErrorHTML(videoId, message) {
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
    .error-message {
      color: rgba(255,255,255,0.6);
      margin-bottom: 32px;
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
    <h1 class="error-title">视频未找到</h1>
    <p class="error-message">抱歉，视频 ${escapeHTML(videoId)} ${escapeHTML(message)}。</p>
    <a href="/" class="back-link">返回首页</a>
  </div>
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

module.exports = { onRequest };
