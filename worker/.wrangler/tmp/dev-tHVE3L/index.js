var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// .wrangler/tmp/bundle-QtuWOo/checked-fetch.js
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-QtuWOo/checked-fetch.js"() {
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_checked_fetch();
    init_modules_watch_stub();
  }
});

// ../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/pages.js
var require_pages = __commonJS({
  "src/pages.js"(exports, module) {
    init_checked_fetch();
    init_modules_watch_stub();
    var WORKER_URL2 = "https://jable-video-proxy.qh13.workers.dev";
    function renderHomePage2(videos = [], stats = {}) {
      const statsBar = stats.totalVideos ? `
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">${stats.totalVideos.toLocaleString()}</span>
        <span class="stat-label">\u89C6\u9891</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${(stats.totalViews || 0).toLocaleString()}</span>
        <span class="stat-label">\u89C2\u770B</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.totalCategories || 0}</span>
        <span class="stat-label">\u5206\u7C7B</span>
      </div>
    </div>
  ` : "";
      let videosHTML = "";
      if (videos.length > 0) {
        videosHTML = `
      <div class="video-grid">
        ${videos.map((video, index) => renderVideoCard(video, index < 4)).join("")}
      </div>
    `;
      } else {
        videosHTML = `
      <div class="empty-state">
        <p>\u6682\u65E0\u89C6\u9891</p>
        <a href="/" class="refresh-link">\u5237\u65B0\u9875\u9762</a>
      </div>
    `;
      }
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u89C6\u9891\u805A\u5408\u5E73\u53F0 - \u805A\u5408\u4F18\u8D28\u89C6\u9891\u5185\u5BB9</title>
  <meta name="description" content="\u805A\u5408\u4F18\u8D28\u89C6\u9891\u5185\u5BB9\uFF0C\u63D0\u4F9B\u6700\u65B0\u3001\u6700\u70ED\u7684\u89C6\u9891\u8D44\u6E90">
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
    <a href="/" class="logo">\u89C6\u9891\u805A\u5408</a>
    <nav class="nav">
      <a href="/">\u9996\u9875</a>
      <a href="/category/recent">\u6700\u65B0</a>
      <a href="/hot">\u70ED\u95E8</a>
      <a href="/search">\u641C\u7D22</a>
    </nav>
  </header>

  <main class="container">
    ${statsBar}
    <section>
      <h2 class="section-title">\u6700\u65B0\u89C6\u9891</h2>
      ${videosHTML}
    </section>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <div>
        <h4>\u5173\u4E8E\u6211\u4EEC</h4>
        <p>\u805A\u5408\u4F18\u8D28\u89C6\u9891\u5185\u5BB9</p>
      </div>
      <div>
        <h4>\u514D\u8D23\u58F0\u660E</h4>
        <p>\u5185\u5BB9\u6765\u81EA\u7B2C\u4E09\u65B9\u5E73\u53F0</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 \u89C6\u9891\u805A\u5408\u5E73\u53F0</p>
    </div>
  </footer>
</body>
</html>`;
    }
    __name(renderHomePage2, "renderHomePage");
    function renderVideoCard(video, priority = false) {
      const authorName = video.authorName || "\u672A\u77E5\u4F5C\u8005";
      return `
    <a href="${WORKER_URL2}/videos/${video.id}" target="_blank" class="video-item">
      <div class="video-thumb">
        ${video.coverUrl ? `<img src="${escapeHTML(video.coverUrl)}" alt="${escapeHTML(video.title)}" ${priority ? 'loading="eager"' : 'loading="lazy"'}>` : ""}
        <span class="video-duration">${escapeHTML(video.duration || "--:--")}</span>
      </div>
      <div class="video-info">
        <h3 class="video-title">${escapeHTML(video.title)}</h3>
        <div class="video-meta">
          ${authorName ? `<span>${escapeHTML(authorName)}</span>` : ""}
          <span>${escapeHTML(video.views || "0")} \u6B21\u89C2\u770B</span>
        </div>
      </div>
    </a>
  `;
    }
    __name(renderVideoCard, "renderVideoCard");
    function renderSearchPage2(keyword = "", videos = [], stats = {}) {
      let videosHTML = "";
      if (keyword && videos.length > 0) {
        videosHTML = `
      <h1>\u641C\u7D22\u7ED3\u679C: "${escapeHTML(keyword)}"</h1>
      <div class="video-grid">
        ${videos.map((video) => renderVideoCard(video)).join("")}
      </div>
      <p class="search-result-count">\u627E\u5230 ${videos.length} \u4E2A\u7ED3\u679C</p>
    `;
      } else if (keyword) {
        videosHTML = `
      <h1>\u641C\u7D22\u7ED3\u679C: "${escapeHTML(keyword)}"</h1>
      <div class="empty-state">
        <p>\u672A\u627E\u5230\u4E0E "<span class="keyword">${escapeHTML(keyword)}</span>" \u76F8\u5173\u7684\u89C6\u9891</p>
      </div>
    `;
      } else {
        videosHTML = `
      <h1>\u641C\u7D22\u89C6\u9891</h1>
      <div class="empty-state">
        <p>\u8BF7\u8F93\u5165\u5173\u952E\u8BCD\u641C\u7D22\u89C6\u9891</p>
      </div>
    `;
      }
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u641C\u7D22 "${escapeHTML(keyword)}" - \u89C6\u9891\u805A\u5408\u5E73\u53F0</title>
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
    <a href="/" class="logo">\u89C6\u9891\u805A\u5408</a>
    <nav class="nav">
      <a href="/">\u9996\u9875</a>
      <a href="/category/recent">\u6700\u65B0</a>
      <a href="/hot">\u70ED\u95E8</a>
      <a href="/search" class="active">\u641C\u7D22</a>
    </nav>
  </header>
  <main class="container">
    ${videosHTML}
  </main>
</body>
</html>`;
    }
    __name(renderSearchPage2, "renderSearchPage");
    function renderVideoPage2(video, videoId, error = null) {
      if (error) {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u9519\u8BEF - \u89C6\u9891\u805A\u5408\u5E73\u53F0</title>
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
  <div class="error-code">${error === "NOT_FOUND" ? "404" : "500"}</div>
  <a href="/">\u8FD4\u56DE\u9996\u9875</a>
</body>
</html>`;
      }
      if (!video) {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\u89C6\u9891\u672A\u627E\u5230 - \u89C6\u9891\u805A\u5408\u5E73\u53F0</title>
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
  <h1>\u89C6\u9891\u672A\u627E\u5230</h1>
  <a href="/">\u8FD4\u56DE\u9996\u9875</a>
</body>
</html>`;
      }
      const streamUrl = video.streamUrl || `${WORKER_URL2}/${videoId}.m3u8`;
      const authorName = video.authorName || "\u672A\u77E5\u4F5C\u8005";
      let tagsHTML = "";
      if (video.tags && video.tags.length > 0) {
        tagsHTML = `
      <div class="tags">
        ${video.tags.map(
          (tag) => `<a href="/search?q=${encodeURIComponent(tag)}" class="tag">${escapeHTML(tag)}</a>`
        ).join("")}
      </div>
    `;
      }
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(video.title)} - \u89C6\u9891\u805A\u5408\u5E73\u53F0</title>
  <meta name="description" content="${escapeHTML(video.description || "")}">
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
    <a href="/" class="logo">\u89C6\u9891\u805A\u5408</a>
    <nav class="nav">
      <a href="/">\u9996\u9875</a>
      <a href="/category/recent">\u6700\u65B0</a>
      <a href="/hot">\u70ED\u95E8</a>
      <a href="/search">\u641C\u7D22</a>
    </nav>
  </header>

  <main>
    <div class="player-wrapper">
      <video controls poster="${escapeHTML(video.coverUrl || "")}" playsinline>
        <source src="${escapeHTML(streamUrl)}" type="application/x-mpegURL">
        \u60A8\u7684\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u89C6\u9891\u64AD\u653E
      </video>
    </div>
    
    <div class="video-info">
      <h1>${escapeHTML(video.title)}</h1>
      
      <div class="video-stats">
        <span>${escapeHTML(video.views || "0")} \u6B21\u89C2\u770B</span>
        <span>${escapeHTML(video.duration || "--:--")}</span>
        <span>${escapeHTML(video.publishDate || "")}</span>
      </div>
      
      <div class="author">
        <div class="author-avatar">${escapeHTML(authorName.charAt(0))}</div>
        <div>
          <div style="font-weight:500;">${escapeHTML(authorName)}</div>
          <div style="font-size:0.8rem;color:rgba(255,255,255,0.5);">\u4E0A\u4F20\u8005</div>
        </div>
      </div>
      
      ${video.description ? `<p class="description">${escapeHTML(video.description)}</p>` : ""}
      
      ${tagsHTML}
      
      <div class="source-link">
        \u6765\u6E90\uFF1A<a href="https://jable.tv/videos/${escapeHTML(videoId)}/" target="_blank" rel="noopener noreferrer">jable.tv</a>
      </div>
    </div>
    
    <a href="/" class="back-link">\u8FD4\u56DE\u9996\u9875</a>
  </main>
</body>
</html>`;
    }
    __name(renderVideoPage2, "renderVideoPage");
    function escapeHTML(str) {
      if (!str) return "";
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    __name(escapeHTML, "escapeHTML");
    module.exports = {
      renderHomePage: renderHomePage2,
      renderSearchPage: renderSearchPage2,
      renderVideoPage: renderVideoPage2
    };
  }
});

// .wrangler/tmp/bundle-QtuWOo/middleware-loader.entry.ts
init_checked_fetch();
init_modules_watch_stub();

// .wrangler/tmp/bundle-QtuWOo/middleware-insertion-facade.js
init_checked_fetch();
init_modules_watch_stub();

// src/index.js
init_checked_fetch();
init_modules_watch_stub();
var ORIGIN_DOMAIN = "jable.tv";
var WORKER_URL = "https://jable-video-proxy.qh13.workers.dev";
var CACHE_CONFIG = {
  m3u8: {
    maxAge: 3,
    // 秒 - m3u8 短期缓存
    cacheKey: "m3u8-cache"
  },
  ts: {
    maxAge: 31536e3,
    // 1年 - 视频分片长期缓存
    cacheKey: "ts-cache"
  },
  api: {
    maxAge: 60,
    // 60秒 - API 缓存
    cacheKey: "api-cache"
  }
};
async function getFromCache(cacheKey, request) {
  const cache = caches.default;
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    const dateHeader = cachedResponse.headers.get("Date");
    if (dateHeader) {
      const cachedTime = new Date(dateHeader).getTime();
      const now = Date.now();
      const maxAge = CACHE_CONFIG[cacheKey]?.maxAge || 60;
      if (now - cachedTime < maxAge * 1e3) {
        return cachedResponse;
      }
    }
  }
  return null;
}
__name(getFromCache, "getFromCache");
async function saveToCache(cacheKey, request, response) {
  const cache = caches.default;
  const maxAge = CACHE_CONFIG[cacheKey]?.maxAge || 60;
  const responseToCache = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });
  responseToCache.headers.set("Cache-Control", `public, max-age=${maxAge}`);
  responseToCache.headers.set("X-Cache-Status", "MISS");
  await cache.put(request, responseToCache);
  return responseToCache;
}
__name(saveToCache, "saveToCache");
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
  if (category && category !== "all" && category !== "uncategorized") {
    conditions.push("v.category = ?");
    queryParams.push(category);
  }
  if (search) {
    conditions.push("(v.title LIKE ? OR v.description LIKE ?)");
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
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
    const videos = await env.DB.prepare(videosQuery).bind(...queryParams).all();
    const countResult = await env.DB.prepare(countQuery).bind(...queryParams.slice(0, -2)).first();
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
    console.error("getVideoList error:", error);
    return { success: false, error: error.message };
  }
}
__name(getVideoList, "getVideoList");
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
      return { success: false, error: "Video not found", errorCode: "NOT_FOUND" };
    }
    await env.DB.prepare(`
      UPDATE videos SET view_count = view_count + 1 WHERE id = ?
    `).bind(videoId).run();
    let streamUrl;
    if (result.stream_primary_url && result.stream_primary_url.startsWith("http")) {
      streamUrl = result.stream_primary_url;
    } else {
      streamUrl = `${WORKER_URL}/${videoId}.m3u8`;
    }
    const tags = result.tags ? JSON.parse(result.tags) : [];
    const streamBackupUrls = result.stream_backup_urls ? JSON.parse(result.stream_backup_urls) : [];
    const streamQualities = result.stream_qualities ? JSON.parse(result.stream_qualities) : {};
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
    console.error("getVideoDetail error:", error);
    return { success: false, error: error.message };
  }
}
__name(getVideoDetail, "getVideoDetail");
async function searchVideos(env, keyword) {
  return getVideoList(env, { search: keyword, limit: 50 });
}
__name(searchVideos, "searchVideos");
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
    console.error("getHotVideos error:", error);
    return { success: false, error: error.message };
  }
}
__name(getHotVideos, "getHotVideos");
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
        categories: result.results.map((cat) => ({
          slug: cat.slug,
          name: cat.name,
          description: cat.description,
          videoCount: cat.video_count || 0
        }))
      }
    };
  } catch (error) {
    console.error("getCategories error:", error);
    return { success: false, error: error.message };
  }
}
__name(getCategories, "getCategories");
async function getStats(env) {
  try {
    const totalResult = await env.DB.prepare("SELECT COUNT(*) as total FROM videos").first();
    const viewResult = await env.DB.prepare("SELECT SUM(view_count) as total FROM videos").first();
    const categoryResult = await env.DB.prepare("SELECT COUNT(DISTINCT category) as total FROM videos").first();
    return {
      success: true,
      data: {
        totalVideos: totalResult?.total || 0,
        totalViews: viewResult?.total || 0,
        totalCategories: categoryResult?.total || 0
      }
    };
  } catch (error) {
    console.error("getStats error:", error);
    return { success: false, error: error.message };
  }
}
__name(getStats, "getStats");
async function saveVideo(env, video) {
  try {
    const existing = await env.DB.prepare(
      "SELECT id FROM videos WHERE id = ?"
    ).bind(video.id).first();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (existing) {
      await env.DB.prepare(`
        UPDATE videos SET
          title = ?, description = ?, duration = ?, views = ?,
          cover_url = ?, category = ?, author_name = ?, author_avatar_url = ?,
          tags = ?, stream_primary_url = ?, stream_backup_urls = ?,
          stream_qualities = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        video.title,
        video.description || null,
        video.duration || null,
        video.views || null,
        video.coverUrl || null,
        video.category || "uncategorized",
        video.author?.name || null,
        video.author?.avatarUrl || null,
        JSON.stringify(video.tags || []),
        video.streamUrls?.primary || null,
        JSON.stringify(video.streamUrls?.backups || []),
        JSON.stringify(video.streamUrls?.qualities || {}),
        now,
        video.id
      ).run();
      return { success: true, action: "updated", id: video.id };
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
        video.id,
        video.title,
        video.description || null,
        video.duration || null,
        video.views || null,
        video.publishDate || null,
        video.coverUrl || null,
        video.thumbnailUrl || null,
        video.sourceUrl || null,
        video.category || "uncategorized",
        video.author?.name || null,
        video.author?.avatarUrl || null,
        JSON.stringify(video.tags || []),
        video.streamUrls?.primary || null,
        JSON.stringify(video.streamUrls?.backups || []),
        JSON.stringify(video.streamUrls?.qualities || {}),
        now,
        now
      ).run();
      return { success: true, action: "created", id: video.id };
    }
  } catch (error) {
    console.error("saveVideo error:", error);
    return { success: false, error: error.message, id: video.id };
  }
}
__name(saveVideo, "saveVideo");
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
__name(saveVideosBatch, "saveVideosBatch");
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
__name(formatVideoForApi, "formatVideoForApi");
function extractVideoId(pathname) {
  const match = pathname.match(/\/([a-zA-Z0-9_-]+)\.m3u8$/);
  if (match) {
    return match[1];
  }
  return null;
}
__name(extractVideoId, "extractVideoId");
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
__name(rewriteManifestUrls, "rewriteManifestUrls");
function getRangeHeader(request) {
  return request.headers.get("Range");
}
__name(getRangeHeader, "getRangeHeader");
function parseRange(range) {
  if (!range) return null;
  const match = range.match(/^bytes=(\d+)-(\d*)$/);
  if (match) {
    return {
      start: parseInt(match[1], 10),
      end: match[2] ? parseInt(match[2], 10) : void 0
    };
  }
  return null;
}
__name(parseRange, "parseRange");
function buildOriginHeaders(request) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": `https://${ORIGIN_DOMAIN}/`,
    "Origin": `https://${ORIGIN_DOMAIN}`
  };
  const range = getRangeHeader(request);
  if (range) {
    headers["Range"] = range;
  }
  const copyHeaders = ["Cookie", "Accept-Encoding"];
  for (const header of copyHeaders) {
    if (request.headers.has(header)) {
      headers[header] = request.headers.get(header);
    }
  }
  return headers;
}
__name(buildOriginHeaders, "buildOriginHeaders");
async function handleRangeRequest(request, originResponse, videoId, segmentPath) {
  const range = getRangeHeader(request);
  if (!range) {
    return originResponse;
  }
  const parsedRange = parseRange(range);
  if (!parsedRange) {
    return new Response("Invalid Range header", {
      status: 416,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "bytes"
      }
    });
  }
  const originUrl = `https://${ORIGIN_DOMAIN}/videos/${videoId}/${segmentPath}`;
  const originReq = await fetch(originUrl, {
    headers: buildOriginHeaders(request)
  });
  if (!originReq.ok) {
    return new Response("Failed to fetch segment", {
      status: originReq.status,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  const contentLength = originReq.headers.get("Content-Length");
  const totalSize = parseInt(contentLength || "0", 10);
  let start = parsedRange.start;
  let end = parsedRange.end !== void 0 ? parsedRange.end : totalSize - 1;
  if (start >= totalSize) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: {
        "Content-Range": `bytes */${totalSize}`,
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "bytes"
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
      "Range": `bytes=${start}-${end}`
    }
  });
  const rangeData = await rangeReq.arrayBuffer();
  const contentRange = `bytes ${start}-${end}/${totalSize}`;
  return new Response(rangeData, {
    status: 206,
    headers: {
      "Content-Type": "video/mp2t",
      "Content-Length": rangeData.byteLength.toString(),
      "Content-Range": contentRange,
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range"
    }
  });
}
__name(handleRangeRequest, "handleRangeRequest");
async function handleSegmentRequest(request, videoId, segmentPath) {
  const cached = await getFromCache("ts", request);
  if (cached) {
    cached.headers.set("X-Cache-Status", "HIT");
    return cached;
  }
  const originUrl = `https://${ORIGIN_DOMAIN}/videos/${videoId}/${segmentPath}`;
  try {
    const originResponse = await fetch(originUrl, {
      method: "GET",
      headers: buildOriginHeaders(request)
    });
    if (!originResponse.ok) {
      return new Response(`Segment not found: ${originResponse.status}`, {
        status: originResponse.status,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const range = getRangeHeader(request);
    if (range) {
      return handleRangeRequest(request, originResponse, videoId, segmentPath);
    }
    const response = new Response(originResponse.body, {
      status: originResponse.status,
      headers: {
        "Content-Type": "video/mp2t",
        "Content-Length": originResponse.headers.get("Content-Length") || "",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*"
      }
    });
    saveToCache("ts", request, response);
    return response;
  } catch (error) {
    return new Response(`Error fetching segment: ${error.message}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
__name(handleSegmentRequest, "handleSegmentRequest");
async function handleM3u8Request(request, videoId) {
  const cached = await getFromCache("m3u8", request);
  if (cached) {
    cached.headers.set("X-Cache-Status", "HIT");
    return cached;
  }
  const originUrl = `https://${ORIGIN_DOMAIN}/videos/${videoId}/index.m3u8`;
  try {
    const originResponse = await fetch(originUrl, {
      method: "GET",
      headers: buildOriginHeaders(request)
    });
    if (!originResponse.ok) {
      return new Response(`Failed to fetch m3u8: ${originResponse.status}`, {
        status: originResponse.status,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const manifest = await originResponse.text();
    const rewrittenManifest = rewriteManifestUrls(manifest, videoId);
    const response = new Response(rewrittenManifest, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Content-Length": Buffer.byteLength(rewrittenManifest),
        "Access-Control-Allow-Origin": "*"
      }
    });
    saveToCache("m3u8", request, response);
    return response;
  } catch (error) {
    return new Response(`Error fetching m3u8: ${error.message}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
__name(handleM3u8Request, "handleM3u8Request");
var { renderHomePage, renderSearchPage, renderVideoPage } = require_pages();
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (pathname.startsWith("/api/")) {
    return handleApiRequest(request, env);
  }
  if (pathname === "/" || pathname === "/index.html") {
    try {
      const [videosResult, statsResult] = await Promise.all([
        getVideoList(env, { page: 1, limit: 24 }),
        getStats(env)
      ]);
      const videos = videosResult.success ? videosResult.data.videos : [];
      const stats = statsResult.success ? statsResult.data : {};
      const html = renderHomePage(videos, stats);
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    } catch (error) {
      console.error("Home page error:", error);
      const html = renderHomePage([], {});
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  }
  if (pathname === "/search") {
    const keyword = url.searchParams.get("q") || url.searchParams.get("keyword") || "";
    try {
      let videos = [];
      let stats = {};
      if (keyword) {
        const [searchRes, statsRes] = await Promise.all([
          fetch(`${WORKER_URL}/api/search?q=${encodeURIComponent(keyword)}&limit=50`, {
            headers: { "Accept": "application/json" }
          }),
          fetch(`${WORKER_URL}/api/stats`, {
            headers: { "Accept": "application/json" }
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
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    } catch (error) {
      console.error("Search page error:", error);
      const html = renderSearchPage(keyword, [], {});
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  }
  const videoPageMatch = pathname.match(/^\/videos\/([^\/]+)$/);
  if (videoPageMatch) {
    const videoId2 = videoPageMatch[1];
    const result = await getVideoDetail(env, videoId2);
    if (!result.success) {
      const html2 = renderVideoPage(null, videoId2, result.errorCode || "NOT_FOUND");
      return new Response(html2, {
        status: result.errorCode === "NOT_FOUND" ? 404 : 500,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    const html = renderVideoPage(result.data, videoId2);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
  const videoId = extractVideoId(pathname);
  if (!videoId) {
    return new Response("Invalid video ID", {
      status: 400,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  if (pathname.endsWith(".ts")) {
    const segmentMatch = pathname.match(/\/videos\/[^\/]+\/(.+)$/);
    const segmentPath = segmentMatch ? segmentMatch[1] : pathname;
    return handleSegmentRequest(request, videoId, segmentPath);
  }
  if (pathname.endsWith(".m3u8")) {
    return handleM3u8Request(request, videoId);
  }
  if (pathname.match(/\.(key|vtt|srt)$/)) {
    const segmentMatch = pathname.match(/\/videos\/[^\/]+\/(.+)$/);
    const segmentPath = segmentMatch ? segmentMatch[1] : pathname;
    return handleSegmentRequest(request, videoId, segmentPath);
  }
  return new Response("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(handleRequest, "handleRequest");
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  if (request.method === "POST" && pathname === "/api/admin/save-video") {
    try {
      const video = await request.json();
      if (!video || !video.id) {
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid video data: missing id"
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
      console.error("save-video API error:", error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
  if (request.method === "POST" && pathname === "/api/admin/save-videos") {
    try {
      const { videos } = await request.json();
      if (!Array.isArray(videos) || videos.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid videos data"
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
      console.error("save-videos API error:", error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  }
  try {
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    if (pathname === "/api/videos") {
      const result = await getVideoList(env, { page, limit, category, search });
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    if (pathname.startsWith("/api/videos/")) {
      const videoId = pathname.split("/").pop();
      const result = await getVideoDetail(env, videoId);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    if (pathname === "/api/search") {
      const keyword = url.searchParams.get("q") || url.searchParams.get("keyword");
      if (!keyword) {
        return new Response(JSON.stringify({
          success: false,
          error: "Missing keyword"
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
    if (pathname === "/api/hot") {
      const result = await getHotVideos(env, limit);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    if (pathname === "/api/categories") {
      const result = await getCategories(env);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    if (pathname === "/api/stats") {
      const result = await getStats(env);
      return new Response(JSON.stringify(result), {
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({ error: "API not found" }), {
      status: 404,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
__name(handleApiRequest, "handleApiRequest");
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (request.method !== "GET" && !request.url.includes("/api/admin")) {
      return new Response("Method not allowed", {
        status: 405,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
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
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};

// ../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_checked_fetch();
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-QtuWOo/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../.nvm/versions/node/v22.14.0/lib/node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-QtuWOo/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
