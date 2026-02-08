/**
 * 前端页面渲染模块
 * 集成到 Cloudflare Worker 中，提供 SSR 页面渲染
 */

const ORIGIN_DOMAIN = 'jable.tv';
const WORKER_URL = 'https://jable-video-proxy.qh13.workers.dev';

/**
 * 渲染首页
 */
function renderHomePage(videos = [], stats = {}) {
  const statsBar = stats.totalVideos ? `
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">${stats.totalVideos.toLocaleString()}</span>
        <span class="stat-label">视频</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${(stats.totalViews || 0).toLocaleString()}</span>
        <span class="stat-label">观看</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.totalCategories || 0}</span>
        <span class="stat-label">分类</span>
      </div>
    </div>
  ` : '';

  let videosHTML = '';
  if (videos.length > 0) {
    videosHTML = `
      <div class="video-grid">
        ${videos.map((video, index) => renderVideoCard(video, index < 4)).join('')}
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

  return `<!DOCTYPE html>
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
    @media (max-width: 768px) {
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
    </nav>
  </header>

  <main class="container">
    ${statsBar}
    <section>
      <h2 class="section-title">最新视频</h2>
      ${videosHTML}
    </section>
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
}

/**
 * 渲染视频卡片
 */
function renderVideoCard(video, priority = false) {
  const authorName = video.authorName || '未知作者';
  
  return `
    <a href="${WORKER_URL}/videos/${video.id}" target="_blank" class="video-item">
      <div class="video-thumb">
        ${video.coverUrl ? 
          `<img src="${escapeHTML(video.coverUrl)}" alt="${escapeHTML(video.title)}" ${priority ? 'loading="eager"' : 'loading="lazy"'}>`
          : ''
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

/**
 * 渲染搜索页
 */
function renderSearchPage(keyword = '', videos = [], stats = {}) {
  let videosHTML = '';
  
  if (keyword && videos.length > 0) {
    videosHTML = `
      <h1>搜索结果: "${escapeHTML(keyword)}"</h1>
      <div class="video-grid">
        ${videos.map(video => renderVideoCard(video)).join('')}
      </div>
      <p class="search-result-count">找到 ${videos.length} 个结果</p>
    `;
  } else if (keyword) {
    videosHTML = `
      <h1>搜索结果: "${escapeHTML(keyword)}"</h1>
      <div class="empty-state">
        <p>未找到与 "<span class="keyword">${escapeHTML(keyword)}</span>" 相关的视频</p>
      </div>
    `;
  } else {
    videosHTML = `
      <h1>搜索视频</h1>
      <div class="empty-state">
        <p>请输入关键词搜索视频</p>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>搜索 "${escapeHTML(keyword)}" - 视频聚合平台</title>
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
    .nav a:hover, .nav a.active { color: #fff; }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    h1 { font-size: 1.5rem; margin-bottom: 24px; }
    .keyword { color: #667eea; }
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
      transition: transform 0.2s;
    }
    .video-item:hover { transform: translateY(-4px); }
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
    .video-info { padding: 16px; }
    .video-title {
      font-size: 1rem;
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
    .search-result-count {
      text-align: center;
      margin-top: 24px;
      color: rgba(255,255,255,0.5);
    }
    @media (max-width: 768px) {
      .video-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
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
  </header>
  <main class="container">
    ${videosHTML}
  </main>
</body>
</html>`;
}

/**
 * 渲染视频详情页
 */
function renderVideoPage(video, videoId, error = null) {
  if (error) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>错误 - 视频聚合平台</title>
  <style>
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
    .error-code { font-size: 6rem; color: #667eea; }
    a {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="error-code">${error === 'NOT_FOUND' ? '404' : '500'}</div>
  <a href="/">返回首页</a>
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
    .error-code { font-size: 6rem; color: #667eea; }
    a {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="error-code">404</div>
  <h1>视频未找到</h1>
  <a href="/">返回首页</a>
</body>
</html>`;
  }

  const streamUrl = video.streamUrl || `${WORKER_URL}/${videoId}.m3u8`;
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
    .nav { display: flex; gap: 20px; }
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
    .source-link a { color: #4da6ff; }
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
    </nav>
  </header>

  <main>
    <div class="player-wrapper">
      <video controls poster="${escapeHTML(video.coverUrl || '')}" playsinline>
        <source src="${escapeHTML(streamUrl)}" type="application/x-mpegURL">
        您的浏览器不支持视频播放
      </video>
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
        来源：<a href="https://jable.tv/videos/${escapeHTML(videoId)}/" target="_blank" rel="noopener noreferrer">jable.tv</a>
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

module.exports = {
  renderHomePage,
  renderSearchPage,
  renderVideoPage
};
