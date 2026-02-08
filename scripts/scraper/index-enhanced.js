/**
 * jable.tv 视频抓取脚本 - 增强版 v2
 *
 * 功能：
 * 1. 抓取视频列表页
 * 2. 抓取视频详情页（增强选择器适配）
 * 3. 自动提取 m3u8 流地址
 * 4. 数据持久化（JSON 文件）
 * 5. 增量更新（避免重复抓取）
 * 6. 日志系统
 * 7. 错误重试机制
 * 8. 调试模式（帮助识别页面结构）
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

// 配置
const CONFIG = {
  // 输出配置
  OUTPUT_DIR: './data',
  VIDEOS_FILE: './data/videos.json',
  CATEGORIES_FILE: './data/categories.json',
  LOG_FILE: './data/scraper.log',

  // jable.tv 配置
  BASE_URL: 'https://jable.tv',
  TIMEOUT: 60000,

  // 抓取配置
  MAX_RETRIES: 3,
  RETRY_DELAY: 3000,
  PAGE_TIMEOUT: 30000,

  // 并发配置
  CONCURRENT_BROWSERS: 1,

  // 调试模式（输出页面结构）
  DEBUG_MODE: process.env.DEBUG === '1',

  // 分类列表
  categories: [
    '/models/',
    '/recent/',
    '/top/',
  ],
};

// 日志系统
class Logger {
  constructor(config) {
    this.config = config;
    this.logs = [];
    this.ensureLogFile();
  }

  ensureLogFile() {
    fs.ensureDirSync(path.dirname(this.config.LOG_FILE));
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    this.logs.push(logEntry);

    // 控制台输出
    const colors = {
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[36m',
    };
    const color = colors[level] || '\x1b[0m';
    console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${data ? JSON.stringify(data) : ''}\x1b[0m`);

    // 定期写入文件
    if (this.logs.length >= 100) {
      this.flushLogs();
    }
  }

  info(message, data) {
    this.log('info', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  error(message, data) {
    this.log('error', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  flushLogs() {
    if (this.logs.length === 0) return;

    const logContent = this.logs.map(log =>
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message} ${log.data ? JSON.stringify(log.data) : ''}`
    ).join('\n') + '\n';

    fs.appendFileSync(this.config.LOG_FILE, logContent);
    this.logs = [];
  }
}

// 存储管理
class Storage {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.videos = new Map();
    this.categories = new Map();

    this.ensureDirectories();
    this.loadFromDisk();
  }

  ensureDirectories() {
    fs.ensureDirSync(this.config.OUTPUT_DIR);
  }

  loadFromDisk() {
    try {
      // 加载视频数据
      if (fs.existsSync(this.config.VIDEOS_FILE)) {
        const data = fs.readJsonSync(this.config.VIDEOS_FILE);
        data.forEach(video => {
          this.videos.set(video.id, video);
        });
        this.logger.info(`Loaded ${this.videos.size} videos from disk`);
      }

      // 加载分类数据
      if (fs.existsSync(this.config.CATEGORIES_FILE)) {
        const data = fs.readJsonSync(this.config.CATEGORIES_FILE);
        data.forEach(cat => {
          this.categories.set(cat.slug, cat);
        });
        this.logger.info(`Loaded ${this.categories.size} categories from disk`);
      }
    } catch (error) {
      this.logger.error('Failed to load data from disk', { error: error.message });
    }
  }

  saveToDisk() {
    try {
      // 保存视频
      const videosArray = Array.from(this.videos.values());
      fs.writeJsonSync(this.config.VIDEOS_FILE, videosArray, { spaces: 2 });
      this.logger.info(`Saved ${videosArray.length} videos to disk`);

      // 保存分类
      const categoriesArray = Array.from(this.categories.values());
      fs.writeJsonSync(this.config.CATEGORIES_FILE, categoriesArray, { spaces: 2 });
      this.logger.info(`Saved ${categoriesArray.length} categories to disk`);
    } catch (error) {
      this.logger.error('Failed to save data to disk', { error: error.message });
    }
  }

  getVideo(id) {
    return this.videos.get(id);
  }

  setVideo(video) {
    this.videos.set(video.id, video);
  }

  hasVideo(id) {
    return this.videos.has(id);
  }

  getVideosNeedingUpdate(olderThan = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - olderThan;
    const needsUpdate = [];

    this.videos.forEach((video, id) => {
      const lastScraped = new Date(video.scrapedAt).getTime();
      if (lastScraped < cutoff) {
        needsUpdate.push(id);
      }
    });

    return needsUpdate;
  }
}

/**
 * jable.tv 抓取器 - 增强版
 */
class JableScraper {
  constructor(config, logger, storage) {
    this.config = config;
    this.logger = logger;
    this.storage = storage;

    this.browser = null;
    this.page = null;
  }

  async init() {
    this.logger.info('Initializing browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    this.page = await this.browser.newPage();

    // 设置请求拦截
    await this.setupRequestInterception();

    this.logger.info('Browser initialized');
  }

  async setupRequestInterception() {
    // 拦截网络请求
    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();

      // 跳过图片、样式表等资源
      if (['image', 'stylesheet', 'font'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // 监听响应
    this.page.on('response', async (response) => {
      if (response.url().includes('.m3u8')) {
        this.logger.debug('Found m3u8 URL', { url: response.url() });
      }
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.logger.info('Browser closed');
    }
  }

  async withRetry(fn, maxRetries = null) {
    maxRetries = maxRetries || this.config.MAX_RETRIES;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        this.logger.warn(`Attempt ${attempt}/${maxRetries} failed`, { error: error.message });

        if (attempt === maxRetries) {
          this.logger.error(`All ${maxRetries} attempts failed`, { error: error.message });
          throw error;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, this.config.RETRY_DELAY * attempt));
      }
    }
  }

  async navigateWithRetry(url, options = {}) {
    return this.withRetry(async () => {
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.PAGE_TIMEOUT,
        ...options,
      });
    });
  }

  /**
   * 调试模式：输出页面结构
   */
  async debugPageStructure(videoId) {
    const url = `${this.config.BASE_URL}/videos/${videoId}/`;
    this.logger.info(`Debugging page structure: ${url}`);

    await this.navigateWithRetry(url);

    // 获取页面 HTML
    const html = await this.page.content();

    // 保存 HTML 到文件
    fs.writeFileSync(`./data/debug-${videoId}.html`, html);
    this.logger.info(`Saved HTML to debug-${videoId}.html`);

    // 获取所有可能的元素
    const debugInfo = await this.page.evaluate(() => {
      const info = {
        h1: [],
        allText: [],
        possibleSelectors: {}
      };

      // 获取所有 h1
      document.querySelectorAll('h1').forEach(el => {
        info.h1.push({
          text: el.textContent?.trim()?.substring(0, 100),
          className: el.className,
          id: el.id
        });
      });

      // 获取包含特定文本的元素
      const possibleFields = {
        '标题': ['title', 'video', 'h1'],
        '时长': ['duration', 'time', 'length', '分', ':'],
        '观看': ['view', '觀看', '播放'],
        '日期': ['date', '日', '發布', '上傳'],
        '分類': ['category', '分類', '標籤'],
        '作者': ['author', '作者', '模特', '上傳者'],
        '標籤': ['tag', '標籤', '标签', 'keywords']
      };

      for (const [field, keywords] of Object.entries(possibleFields)) {
        info.possibleSelectors[field] = keywords.map(kw => {
          const els = document.querySelectorAll(`[class*="${kw}"], [id*="${kw}"]`);
          return {
            keyword: kw,
            count: els.length,
            examples: Array.from(els).slice(0, 3).map(el => ({
              tag: el.tagName,
              class: el.className?.substring(0, 50),
              text: el.textContent?.trim()?.substring(0, 30)
            }))
          };
        });
      }

      return info;
    });

    console.log('\n=== 调试信息 ===');
    console.log(JSON.stringify(debugInfo, null, 2));

    return debugInfo;
  }

  /**
   * 增强版视频详情提取 - 多种选择器尝试
   */
  async scrapeVideoDetailEnhanced(videoId) {
    const url = `${this.config.BASE_URL}/videos/${videoId}/`;
    this.logger.info(`Enhanced scraping video detail: ${videoId}`);

    await this.navigateWithRetry(url);

    // 等待页面加载
    await this.page.waitForLoadState('networkidle');

    // 提取视频信息
    const videoData = await this.page.evaluate(() => {
      const data = {
        id: null,
        title: '',
        description: '',
        coverUrl: '',
        duration: '',
        views: '',
        publishDate: '',
        category: '',
        author: {
          name: '',
          avatarUrl: '',
        },
        tags: [],
        streamUrls: {
          primary: null,
          backups: [],
          qualities: {},
        },
        scrapedAt: new Date().toISOString(),
        _debug: {}
      };

      // 1. 提取视频 ID
      const urlMatch = window.location.href.match(/jable\.tv\/videos\/([^\/]+)/);
      if (urlMatch) {
        data.id = urlMatch[1];
      }

      // 2. 提取标题 - 多种方法
      const titleMethods = [
        // 方法1: 直接获取 h1
        () => {
          const h1 = document.querySelector('h1');
          return h1?.textContent?.trim();
        },
        // 方法2: meta og:title
        () => {
          const meta = document.querySelector('meta[property="og:title"]');
          return meta?.getAttribute('content')?.trim();
        },
        // 方法3: page-title
        () => {
          const title = document.querySelector('title');
          return title?.textContent?.trim();
        },
        // 方法4: 查找包含视频标题的元素
        () => {
          const h1s = document.querySelectorAll('h1');
          for (const h1 of h1s) {
            const text = h1.textContent?.trim();
            if (text && text.length > 5 && text.length < 200) {
              return text;
            }
          }
          return null;
        }
      ];

      for (const method of titleMethods) {
        data.title = method();
        if (data.title) break;
      }
      data._debug.titleMethod = data.title ? 'found' : 'not found';

      // 3. 提取描述 - 多种方法
      const descMethods = [
        () => {
          const meta = document.querySelector('meta[property="og:description"]');
          return meta?.getAttribute('content')?.trim();
        },
        () => {
          const meta = document.querySelector('meta[name="description"]');
          return meta?.getAttribute('content')?.trim();
        },
        () => {
          const divs = document.querySelectorAll('div');
          for (const div of divs) {
            const text = div.textContent?.trim();
            if (text && text.length > 50 && text.length < 500) {
              return text;
            }
          }
          return null;
        }
      ];

      for (const method of descMethods) {
        data.description = method();
        if (data.description) break;
      }

      // 4. 提取封面图
      const coverMethods = [
        () => {
          const meta = document.querySelector('meta[property="og:image"]');
          return meta?.getAttribute('content')?.trim();
        },
        () => {
          const img = document.querySelector('.cover-img img, .video-cover img, .player-poster');
          return img?.src || img?.dataset?.src;
        },
        () => {
          const img = document.querySelector('img[src*="preview"], img[src*="cover"]');
          return img?.src;
        }
      ];

      for (const method of coverMethods) {
        data.coverUrl = method();
        if (data.coverUrl) break;
      }

      // 5. 提取时长 - 多种方法
      const durationMethods = [
        () => {
          // 查找包含冒号的时间格式 (如 12:34)
          const allText = document.body.textContent;
          const match = allText.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
          if (match) return match[1];
          return null;
        },
        () => {
          const el = document.querySelector('[class*="duration"], [class*="time"]');
          return el?.textContent?.trim();
        },
        () => {
          const spans = document.querySelectorAll('span');
          for (const span of spans) {
            const text = span.textContent?.trim();
            if (/^\d{1,2}:\d{2}$/.test(text)) {
              return text;
            }
          }
          return null;
        }
      ];

      for (const method of durationMethods) {
        data.duration = method();
        if (data.duration) break;
      }

      // 6. 提取观看次数
      const viewsMethods = [
        () => {
          const allText = document.body.textContent;
          // 查找数字 + 次/views/播放
          const match = allText.match(/([\d,.]+[KMkm]?)\s*(?:次|views|播放|觀看)/);
          if (match) return match[0];
          return null;
        },
        () => {
          const el = document.querySelector('[class*="view"], [class*="play"]');
          return el?.textContent?.trim();
        }
      ];

      for (const method of viewsMethods) {
        data.views = method();
        if (data.views) break;
      }

      // 7. 提取发布日期
      const dateMethods = [
        () => {
          const allText = document.body.textContent;
          // 查找日期格式
          const match = allText.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
          if (match) return match[1];
          return null;
        },
        () => {
          const el = document.querySelector('[class*="date"], [class*="time"]');
          return el?.textContent?.trim();
        }
      ];

      for (const method of dateMethods) {
        data.publishDate = method();
        if (data.publishDate) break;
      }

      // 8. 提取分类
      const categoryMethods = [
        () => {
          // 面包屑导航
          const breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a');
          if (breadcrumbs.length > 0) {
            const last = breadcrumbs[breadcrumbs.length - 1];
            return last?.textContent?.trim();
          }
          return null;
        },
        () => {
          const el = document.querySelector('[class*="category"], [class*="tag"]');
          return el?.textContent?.trim();
        }
      ];

      for (const method of categoryMethods) {
        data.category = method();
        if (data.category) break;
      }

      // 9. 提取作者信息
      const authorMethods = [
        () => {
          const el = document.querySelector('[class*="author"], [class*="model"], [class*="uploader"]');
          if (el) {
            return {
              name: el.textContent?.trim(),
              avatarUrl: el.querySelector('img')?.src
            };
          }
          return null;
        },
        () => {
          // 从 URL 路径提取
          const match = window.location.href.match(/jable\.tv\/videos\/[^\/]+\/(.+?)\//);
          if (match) return { name: match[1] };
          return null;
        }
      ];

      for (const method of authorMethods) {
        const result = method();
        if (result) {
          data.author.name = result.name || '';
          data.author.avatarUrl = result.avatarUrl || '';
          break;
        }
      }

      // 10. 提取标签
      const tagMethods = [
        () => {
          // 查找链接形式的标签
          const links = document.querySelectorAll('a[href*="/tags/"], a[href*="/categories/"]');
          return Array.from(links).map(a => a.textContent?.trim()).filter(Boolean);
        },
        () => {
          // 查找类名包含 tag 的元素
          const tags = document.querySelectorAll('[class*="tag"]');
          return Array.from(tags).map(t => t.textContent?.trim()).filter(Boolean);
        }
      ];

      for (const method of tagMethods) {
        data.tags = method();
        if (data.tags.length > 0) break;
      }

      return data;
    });

    // 从网络请求中提取 m3u8 URL
    const streamData = await this.extractStreamFromNetwork();
    if (streamData) {
      videoData.streamUrls = streamData;
    }

    this.logger.info(`Video detail scraped: ${videoData.title}`, {
      id: videoData.id,
      hasDescription: !!videoData.description,
      hasDuration: !!videoData.duration,
      hasViews: !!videoData.views,
      hasCategory: !!videoData.category,
      hasAuthor: !!videoData.author.name,
      hasTags: videoData.tags.length > 0,
      hasStream: !!videoData.streamUrls.primary
    });

    return videoData;
  }

  /**
   * 抓取视频列表页
   */
  async scrapeVideoList(category = '/recent/', pageNum = 1) {
    const url = `${this.config.BASE_URL}${category}page/${pageNum}/`;
    this.logger.info(`Scraping video list: ${url}`);

    await this.navigateWithRetry(url);

    // 等待视频列表加载
    await this.page.waitForSelector('.video-item', { timeout: 10000 }).catch(() => null);

    const videos = await this.page.evaluate(() => {
      const items = document.querySelectorAll('.video-item');

      return Array.from(items).map(item => {
        const link = item.querySelector('a');
        const img = item.querySelector('.img-cover img, .cover-img');
        const title = item.querySelector('.video-title, .title');
        const duration = item.querySelector('.duration, .video-duration');
        const views = item.querySelector('.views, .view-count');

        // 从 URL 中提取视频 ID
        const href = link?.href || '';
        const idMatch = href.match(/jable\.tv\/videos\/([^\/]+)/);
        const videoId = idMatch ? idMatch[1] : null;

        return {
          id: videoId,
          url: href,
          title: title?.textContent?.trim() || '',
          coverUrl: img?.src || img?.dataset?.src || '',
          duration: duration?.textContent?.trim() || '',
          views: views?.textContent?.trim() || '',
        };
      });
    });

    this.logger.info(`Found ${videos.length} videos on page ${pageNum}`);

    return videos;
  }

  /**
   * 从网络请求中提取 m3u8 URL
   */
  async extractStreamFromNetwork() {
    try {
      const m3u8Url = await this.page.waitForRequest(request => {
        return request.url().includes('.m3u8') &&
               (request.url().includes('akuma') ||
                request.url().includes('saawsedge') ||
                request.url().includes('media-hls') ||
                request.url().includes('jable'));
      }, { timeout: 15000 }).then(request => request.url()).catch(() => null);

      if (!m3u8Url) {
        this.logger.warn('No m3u8 URL found in network requests');
        return { url: null };
      }

      // 解析 m3u8 URL 获取信息
      const urlMatch = m3u8Url.match(/\/hls\/([^\/]+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.m3u8/);
      if (urlMatch) {
        return {
          url: m3u8Url,
          cdn: 'akuma-trstin.mushroomtrack.com',
          token: urlMatch[1],
          timestamp: urlMatch[2],
          folder: urlMatch[3],
          internalId: urlMatch[4],
          filename: urlMatch[5],
          format: 'master'
        };
      }

      return { url: m3u8Url, format: 'direct' };
    } catch (error) {
      this.logger.warn('Failed to extract stream URL', { error: error.message });
      return { url: null };
    }
  }

  /**
   * 抓取单个分类
   */
  async scrapeCategory(category, maxPages = 5) {
    this.logger.info(`Starting to scrape category: ${category}`);

    const allVideos = [];
    let hasMore = true;
    let pageNum = 1;

    while (hasMore && pageNum <= maxPages) {
      try {
        const videos = await this.scrapeVideoList(category, pageNum);

        if (videos.length === 0) {
          hasMore = false;
          break;
        }

        // 去重并保存
        for (const video of videos) {
          if (!video.id) continue;

          // 检查是否已存在
          if (this.storage.hasVideo(video.id)) {
            const existing = this.storage.getVideo(video.id);

            // 更新元数据（如果视频信息有变化）
            if (existing.title !== video.title || existing.coverUrl !== video.coverUrl) {
              existing.title = video.title;
              existing.coverUrl = video.coverUrl;
              existing.duration = video.duration;
              existing.views = video.views;
              existing.scrapedAt = new Date().toISOString();
              this.storage.setVideo(existing);
            }
          } else {
            // 新视频，使用增强版详情抓取
            const detail = await this.scrapeVideoDetailEnhanced(video.id);
            this.storage.setVideo(detail);
          }

          allVideos.push(video);
        }

        // 保存到磁盘
        this.storage.saveToDisk();

        pageNum++;

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        this.logger.error(`Failed to scrape page ${pageNum}`, { error: error.message });
        hasMore = false;
      }
    }

    this.logger.info(`Finished scraping category: ${category}, found ${allVideos.length} videos`);

    return allVideos;
  }

  /**
   * 增量更新：只抓取需要更新的视频
   */
  async incrementalUpdate() {
    const needsUpdate = this.storage.getVideosNeedingUpdate();
    this.logger.info(`Found ${needsUpdate.length} videos needing update`);

    let updated = 0;
    let failed = 0;

    for (const videoId of needsUpdate) {
      try {
        // 使用增强版抓取
        const detail = await this.scrapeVideoDetailEnhanced(videoId);

        // 更新现有数据
        const existing = this.storage.getVideo(videoId);
        if (existing) {
          Object.assign(existing, detail, { scrapedAt: new Date().toISOString() });
          this.storage.setVideo(existing);
          updated++;
        }

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        this.logger.error(`Failed to update video: ${videoId}`, { error: error.message });
        failed++;
      }

      // 定期保存
      if (updated % 10 === 0) {
        this.storage.saveToDisk();
      }
    }

    // 最终保存
    this.storage.saveToDisk();

    this.logger.info(`Incremental update complete: ${updated} updated, ${failed} failed`);

    return { updated, failed };
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'help';
  const category = args.find(arg => arg.startsWith('--category='))?.split('=')[1] || '/recent/';
  const maxPages = parseInt(args.find(arg => arg.startsWith('--max-pages='))?.split('=')[1] || '5');
  const videoId = args.find(arg => arg.startsWith('--video-id='))?.split('=')[1];

  // 初始化
  const logger = new Logger(CONFIG);
  const storage = new Storage(CONFIG, logger);
  const scraper = new JableScraper(CONFIG, logger, storage);

  try {
    await scraper.init();

    switch (mode) {
      case 'debug':
        // 调试模式：输出页面结构
        if (!videoId) {
          console.error('Error: --video-id is required for debug mode');
          process.exit(1);
        }
        await scraper.debugPageStructure(videoId);
        break;

      case 'list':
        // 抓取视频列表
        const videos = await scraper.scrapeVideoList(category);
        console.log(`\n✅ Found ${videos.length} videos`);
        console.log(JSON.stringify(videos.slice(0, 3), null, 2));
        break;

      case 'detail':
        // 抓取单个视频详情（增强版）
        if (!videoId) {
          console.error('Error: --video-id is required for detail mode');
          process.exit(1);
        }

        const detail = await scraper.scrapeVideoDetailEnhanced(videoId);

        console.log('\n✅ Video detail:');
        console.log(JSON.stringify({
          id: detail.id,
          title: detail.title?.substring(0, 50),
          description: detail.description?.substring(0, 100),
          duration: detail.duration,
          views: detail.views,
          category: detail.category,
          author: detail.author.name,
          tagsCount: detail.tags.length,
          hasStream: !!detail.streamUrls.primary,
        }, null, 2));

        // 保存到存储
        storage.setVideo(detail);
        storage.saveToDisk();
        break;

      case 'category':
        // 抓取整个分类
        await scraper.scrapeCategory(category, maxPages);
        break;

      case 'full':
        // 抓取所有分类
        for (const cat of CONFIG.categories) {
          await scraper.scrapeCategory(cat, maxPages);
        }
        break;

      case 'incremental':
        // 增量更新
        await scraper.incrementalUpdate();
        break;

      case 'help':
      default:
        console.log(`
jable.tv Video Scraper v2 (Enhanced)

Usage:
  node index-enhanced.js --mode=<mode> [options]

Modes:
  debug       - Debug page structure (for testing selectors)
  list        - Scrape video list from a category page
  detail      - Scrape detailed info for a single video (enhanced)
  category    - Scrape all videos in a category
  full        - Scrape all configured categories
  incremental - Update videos that haven't been updated recently
  help        - Show this help message

Options:
  --mode=<mode>           Operation mode (required)
  --category=<path>       Category path (default: /recent/)
  --max-pages=<num>       Maximum pages to scrape per category (default: 5)
  --video-id=<id>         Video ID for detail/debug mode (required for detail/debug mode)

Environment Variables:
  DEBUG=1                 Enable debug mode

Examples:
  # Debug page structure
  DEBUG=1 node index-enhanced.js --mode=debug --video-id=dldss-460

  # Test enhanced scraping
  node index-enhanced.js --mode=detail --video-id=dldss-460

  # Scrape a category
  node index-enhanced.js --mode=category --category=/recent/ --max-pages=3

  # Full scrape
  node index-enhanced.js --mode=full --max-pages=2

  # Incremental update
  node index-enhanced.js --mode=incremental
`);
        break;
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    // 清理
    await scraper.close();
    logger.flushLogs();
  }
}

// 导出类供其他脚本使用
module.exports = {
  JableScraper,
  Storage,
  Logger,
  CONFIG,
};

// 如果直接运行
if (require.main === module) {
  main();
}
