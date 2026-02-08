/**
 * Cloudflare Pages Function - 搜索页 SSR 渲染
 * 处理 /search 路径，返回搜索结果页面
 */

// API 基础地址
function getApiBaseUrl(context) {
  if (context.vars && context.vars.NEXT_PUBLIC_API_URL) {
    return context.vars.NEXT_PUBLIC_API_URL;
  }
  return 'https://jable-video-proxy.qh13.workers.dev';
}

async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  // 只处理搜索路径
  if (pathname !== '/search') {
    return new Response('Not Found', { status: 404 });
  }
  
  const API_BASE_URL = getApiBaseUrl(context);
  const keyword = url.searchParams.get('q') || url.searchParams.get('keyword') || '';
  
  try {
    // 获取统计信息和搜索结果
    const tasks = [
      fetch(`${API_BASE_URL}/api/stats`, {
        headers: { 'Accept': 'application/json' }
      })
    ];
    
    // 如果有关键词，添加搜索请求
    if (keyword) {
      tasks.push(
        fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(keyword)}&limit=50`, {
          headers: { 'Accept': 'application/json' }
        })
      );
    } else {
      tasks.push(Promise.resolve(null));
    }
    
    const [statsRes, searchRes] = await Promise.all(tasks);
    
    const statsData = await statsRes.json();
    const searchData = searchRes ? await searchRes.json() : null;
    
    const stats = statsData.success ? statsData.data : { totalVideos: 0, totalViews: 0 };
    const videos = (searchData && searchData.success) ? searchData.data.videos : [];
    const totalPages = (searchData && searchData.success) ? searchData.data.pagination.totalPages : 0;
    
    // 生成视频卡片 HTML
    let videosHTML = '';
    if (keyword && videos.length > 0) {
      videosHTML = `
        <div class="video-grid">
          ${videos.map((video) => generateVideoCard(video, API_BASE_URL)).join('')}
        </div>
        <div class="pagination">
          <p>找到 ${videos.length} 个结果</p>
        </div>
      `;
    } else if (keyword) {
      videosHTML = `
        <div class="empty-state">
          <p>未找到与 " <span class="keyword">${escapeHTML(keyword)}</span> " 相关的视频</p>
          <a href="/search" class="refresh-link">清除搜索</a>
        </div>
      `;
    } else {
      videosHTML = `
        <div class="empty-state">
          <p>请输入关键词搜索视频</p>
        </div>
      `;
    }
    
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>搜索 "${escapeHTML(keyword)}" - 视频聚合平台</title>
  <meta name="description" content="搜索视频：${escapeHTML(keyword)}">
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
      transition: color 0.2s;
    }
    .nav a:hover, .nav a.active {
      color: #fff;
    }
    .search-container {
      margin-left: auto;
      display: flex;
      gap: 8px;
    }
    .search-input {
      padding: 8px 16px;
      border: none;
      border-radius: 20px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      width: 280px;
      font-size: 0.9rem;
    }
    .search-input::placeholder {
      color: rgba(255,255,255,0.5);
    }
    .search-btn {
      padding: 8px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 20px;
      color: #fff;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    .page-title {
      font-size: 1.5rem;
      margin-bottom: 24px;
    }
    .keyword {
      color: #667eea;
    }
    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .video-item {
      display: block;
      text-decoration: none;
      color: inherit;
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255,255,255,0.03);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .video-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    }
    .video-thumb {
      position: relative;
      aspect-ratio: 16/10;
      background: #1a1a2e;
    }
    .video-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .video-duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0,0,0,0.8);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .video-info {
      padding: 16px;
    }
    .video-title {
      font-size: 1rem;
      font-weight: 500;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .video-meta {
      margin-top: 8px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.5);
    }
    .empty-state {
      text-align: center;
      padding: 60px 0;
      color: rgba(255,255,255,0.6);
    }
    .empty-state .keyword {
      font-size: 1.2rem;
    }
    .refresh-link {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 24px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      color: #667eea;
      text-decoration: none;
    }
    .pagination {
      text-align: center;
      margin-top: 24px;
      color: rgba(255,255,255,0.5);
    }
    .footer {
      background: rgba(255,255,255,0.02);
      border-top: 1px solid rgba(255,255,255,0.05);
      padding: 40px 24px;
      margin-top: 48px;
      text-align: center;
      color: rgba(255,255,255,0.4);
      font-size: 0.85rem;
    }
    @media (max-width: 768px) {
      .search-container { width: 100%; }
      .search-input { width: 100%; }
      .video-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 16px;
      }
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
      <a href="/search" class="active">搜索</a>
    </nav>
    <form class="search-container" action="/search">
      <input type="text" name="q" class="search-input" 
             placeholder="搜索视频..." 
             value="${escapeHTML(keyword)}">
      <button type="submit" class="search-btn">搜索</button>
    </form>
  </header>

  <main class="container">
    ${keyword ? `<h1 class="page-title">搜索结果: "<span class="keyword">${escapeHTML(keyword)}</span>"</h1>` : '<h1 class="page-title">搜索视频</h1>'}
    ${videosHTML}
  </main>

  <footer class="footer">
    <p>&copy; 2024 视频聚合平台 | 共 ${stats.totalVideos.toLocaleString()} 个视频</p>
  </footer>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=30', // 搜索结果短时间缓存
      },
    });
    
  } catch (error) {
    console.error('Search page error:', error);
    return new Response(generateErrorHTML(error.message), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function generateVideoCard(video, apiBaseUrl) {
  const authorName = video.authorName || '未知作者';
  const WORKER_URL = apiBaseUrl;
  
  return `
    <a href="${WORKER_URL}/videos/${video.id}" target="_blank" class="video-item">
      <div class="video-thumb">
        <img src="${escapeHTML(video.coverUrl)}" alt="${escapeHTML(video.title)}" loading="lazy">
        <span class="video-duration">${escapeHTML(video.duration || '--:--')}</span>
      </div>
      <div class="video-info">
        <h3 class="video-title">${escapeHTML(video.title)}</h3>
        <div class="video-meta">
          ${authorName ? `<span>${escapeHTML(authorName)}</span>` : ''}
          <span>${escapeHTML(video.views || '0')} 次观看</span>
        </div>
      </div>
    </a>
  `;
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

function generateErrorHTML(message) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>错误 - 视频聚合平台</title>
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
      margin-top: 16px;
      padding: 12px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-code">500</div>
    <a href="/" class="back-link">返回首页</a>
  </div>
</body>
</html>`;
}

module.exports = { onRequest };
