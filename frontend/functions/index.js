/**
 * Cloudflare Pages Function - 首页 SSR 渲染
 * 处理 / 路径，返回视频列表页面
 * 
 * 优点：
 * - SEO 友好
 * - 首屏快速加载
 * - 减少客户端请求
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
  
  // 只处理首页路径
  if (pathname !== '/' && pathname !== '/index.html') {
    return new Response('Not Found', { status: 404 });
  }
  
  const API_BASE_URL = getApiBaseUrl(context);
  
  try {
    // 并行获取视频列表和统计信息
    const [videosRes, statsRes, categoriesRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/videos?page=1&limit=24`, {
        headers: { 'Accept': 'application/json' }
      }),
      fetch(`${API_BASE_URL}/api/stats`, {
        headers: { 'Accept': 'application/json' }
      }),
      fetch(`${API_BASE_URL}/api/categories`, {
        headers: { 'Accept': 'application/json' }
      })
    ]);
    
    const videosData = await videosRes.json();
    const statsData = await statsRes.json();
    const categoriesData = await categoriesRes.json();
    
    const videos = videosData.success ? videosData.data.videos : [];
    const stats = statsData.success ? statsData.data : { totalVideos: 0, totalViews: 0, totalCategories: 0 };
    const categories = categoriesData.success ? categoriesData.data.categories : [];
    
    // 生成分类导航 HTML
    let categoriesHTML = '';
    const mainCategories = [
      { name: '全部', slug: 'all' },
      { name: '最新', slug: 'recent' },
      { name: '热门', slug: 'top' },
      ...categories.slice(0, 5)
    ];
    
    categoriesHTML = `
      <div class="category-nav">
        ${mainCategories.map((cat, index) => `
          <a href="${cat.slug === 'all' ? '/' : cat.slug === 'top' ? '/hot' : '/' + cat.slug}" 
             class="category-item ${index === 0 ? 'active' : ''}">
            ${cat.name}
          </a>
        `).join('')}
      </div>
    `;
    
    // 生成视频卡片 HTML
    let videosHTML = '';
    if (videos.length > 0) {
      videosHTML = `
        <div class="video-grid">
          ${videos.map((video, index) => generateVideoCard(video, API_BASE_URL, index < 4)).join('')}
        </div>
      `;
    } else {
      videosHTML = `
        <div class="empty-state">
          <p>暂无视频</p>
          <a href="/" class="refresh-link">刷新页面</a>
        </div>
      `;
    }
    
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>视频聚合平台 - 聚合优质视频内容</title>
  <meta name="description" content="聚合优质视频内容，提供最新、最热的视频资源">
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
      position: sticky;
      top: 0;
      z-index: 100;
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
    .search-box {
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
      width: 200px;
      font-size: 0.9rem;
    }
    .search-input::placeholder {
      color: rgba(255,255,255,0.5);
    }
    .search-btn {
      padding: 8px 16px;
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
      padding: 0 24px;
    }
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 48px;
      padding: 24px;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      display: block;
      font-size: 1.8rem;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.5);
    }
    .category-nav {
      display: flex;
      gap: 12px;
      padding: 20px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      overflow-x: auto;
    }
    .category-item {
      padding: 8px 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 20px;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      font-size: 0.9rem;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .category-item:hover, .category-item.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      padding: 24px 0;
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
      overflow: hidden;
    }
    .video-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
    .video-item:hover .video-thumb img {
      transform: scale(1.05);
    }
    .video-duration {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0,0,0,0.8);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #fff;
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
      margin-bottom: 8px;
    }
    .video-meta {
      display: flex;
      gap: 12px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.5);
    }
    .ad-banner {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
      color: rgba(255,255,255,0.6);
    }
    .section-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 16px;
      padding-top: 24px;
    }
    .footer {
      background: rgba(255,255,255,0.02);
      border-top: 1px solid rgba(255,255,255,0.05);
      padding: 40px 24px;
      margin-top: 48px;
    }
    .footer-inner {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 24px;
    }
    .footer h4 {
      color: rgba(255,255,255,0.8);
      margin-bottom: 12px;
    }
    .footer p {
      color: rgba(255,255,255,0.5);
      font-size: 0.9rem;
    }
    .footer-bottom {
      max-width: 1400px;
      margin: 24px auto 0;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.05);
      text-align: center;
      color: rgba(255,255,255,0.4);
      font-size: 0.85rem;
    }
    .loading {
      text-align: center;
      padding: 60px 0;
      color: rgba(255,255,255,0.5);
    }
    .skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-item {
      border-radius: 12px;
      overflow: hidden;
    }
    .skeleton-thumb {
      aspect-ratio: 16/10;
    }
    .skeleton-info {
      padding: 16px;
    }
    .skeleton-title {
      height: 18px;
      margin-bottom: 8px;
      border-radius: 4px;
    }
    .skeleton-meta {
      height: 14px;
      width: 60%;
      border-radius: 4px;
    }
    @media (max-width: 768px) {
      .search-box { display: none; }
      .video-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 16px;
      }
      .stats-bar { gap: 24px; }
      .stat-value { font-size: 1.4rem; }
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
    <form class="search-box" action="/search">
      <input type="text" name="q" class="search-input" placeholder="搜索视频...">
      <button type="submit" class="search-btn">搜索</button>
    </form>
  </header>

  <main>
    <div class="container">
      <!-- 统计栏 -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-value">${stats.totalVideos.toLocaleString()}</span>
          <span class="stat-label">视频</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.totalViews.toLocaleString()}</span>
          <span class="stat-label">观看</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.totalCategories}</span>
          <span class="stat-label">分类</span>
        </div>
      </div>

      <!-- 分类导航 -->
      ${categoriesHTML}

      <!-- 广告位 -->
      <div class="ad-banner">
        广告位 - 可放置广告代码
      </div>

      <!-- 视频列表 -->
      <section>
        <h2 class="section-title">最新视频</h2>
        ${videosHTML}
      </section>
    </div>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <div>
        <h4>关于我们</h4>
        <p>聚合优质视频内容</p>
      </div>
      <div>
        <h4>免责声明</h4>
        <p>内容来自第三方平台</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 视频聚合平台</p>
    </div>
  </footer>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60', // 缓存 60 秒
      },
    });
    
  } catch (error) {
    console.error('Home page error:', error);
    return new Response(generateErrorHTML(error.message), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function generateVideoCard(video, apiBaseUrl, priority = false) {
  const authorName = video.authorName || '未知作者';
  const WORKER_URL = apiBaseUrl;
  
  return `
    <a href="${WORKER_URL}/videos/${video.id}" target="_blank" class="video-item">
      <div class="video-thumb">
        ${video.coverUrl ? 
          `<img src="${escapeHTML(video.coverUrl)}" alt="${escapeHTML(video.title)}" ${priority ? 'loading="eager"' : 'loading="lazy"'}>`
          : `<div class="skeleton skeleton-thumb"></div>`
        }
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
    .error-message {
      color: rgba(255,255,255,0.6);
      margin-bottom: 24px;
    }
    .back-link {
      display: inline-block;
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
    <h1>服务器错误</h1>
    <p class="error-message">${escapeHTML(message)}</p>
    <a href="/" class="back-link">返回首页</a>
  </div>
</body>
</html>`;
}

module.exports = { onRequest };
