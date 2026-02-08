/**
 * jable.tv 视频抓取脚本 - 增强版
 * 
 * 功能：
 * 1. 抓取视频列表页
 * 2. 抓取视频详情页
 * 3. 自动提取 m3u8 流地址
 * 4. 数据持久化（JSON 文件）
 * 5. 增量更新（避免重复抓取）
 * 6. 日志系统
 * 7. 错误重试机制
 * 8. 分类抓取
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
  
  // 分类列表
  categories: [
    '/models/',
    '/recent/',
    '/top/',
    // 可以添加更多分类
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

// jable.tv 抓取器
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
   * 抓取视频详情页
   */
  async scrapeVideoDetail(videoId) {
    const url = `${this.config.BASE_URL}/videos/${videoId}/`;
    this.logger.info(`Scraping video detail: ${videoId}`);
    
    await this.navigateWithRetry(url);
    
    // 等待页面主要元素加载
    await this.page.waitForSelector('.video-container, .player-wrapper', { timeout: 15000 }).catch(() => null);
    
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
      };

      // 提取视频 ID
      const urlMatch = window.location.href.match(/jable\.tv\/videos\/([^\/]+)/);
      if (urlMatch) {
        data.id = urlMatch[1];
      }

      // 提取标题 - jable.tv 新结构适配
      const titleEl = document.querySelector(
        'h1.video-title, h1.title, .video-info h1, .video-header h1, ' +
        '.title-wrap h1, h1[class*="title"], .video-detail-header h1'
      );
      if (!titleEl) {
        // 尝试从 meta 标签获取
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle) {
          data.title = metaTitle.getAttribute('content')?.trim() || '';
        }
      } else {
        data.title = titleEl.textContent?.trim() || '';
      }

      // 提取描述 - jable.tv 新结构适配
      const descEl = document.querySelector(
        '.video-description, .description, .video-desc, ' +
        '.video-info .info-text, .video-detail .detail-info, ' +
        'meta[property="og:description"]'
      );
      if (descEl) {
        if (descEl.tagName === 'META') {
          data.description = descEl.getAttribute('content')?.trim() || '';
        } else {
          data.description = descEl.textContent?.trim() || '';
        }
      }

      // 提取封面图 - 多种选择器适配
      const coverEl = document.querySelector(
        '.cover-img, .video-cover img, .player-poster, ' +
        '.video-thumbnail img, .thumbnail img, ' +
        'meta[property="og:image"]'
      );
      if (coverEl) {
        if (coverEl.tagName === 'META') {
          data.coverUrl = coverEl.getAttribute('content') || '';
        } else {
          data.coverUrl = coverEl.src || coverEl.dataset?.src || '';
        }
      }

      // 提取时长 - jable.tv 新结构适配
      const durationEl = document.querySelector(
        '.duration, .video-duration, .video-length, ' +
        '.time-tag, [class*="duration"] span, ' +
        '.player-controls .duration, .video-info .duration'
      );
      if (durationEl) {
        data.duration = durationEl.textContent?.trim() ||
                        durationEl.dataset?.content?.trim() || '';
      }

      // 提取观看次数
      const viewsEl = document.querySelector(
        '.views, .view-count, .video-views, ' +
        '[class*="views"] span, .video-info .views, ' +
        '.play-count, .video-stats .views'
      );
      if (viewsEl) {
        data.views = viewsEl.textContent?.trim() || '';
      }

      // 提取发布日期
      const dateEl = document.querySelector(
        '.publish-date, .upload-date, .date, ' +
        '.video-date, .video-info .date, ' +
        '[class*="date"] span, .video-stats .date'
      );
      if (dateEl) {
        data.publishDate = dateEl.textContent?.trim() || '';
      }

      // 提取分类
      const categoryEl = document.querySelector(
        '.category a, .video-category a, .breadcrumbs a:last-child, ' +
        '.video-info .category a, .video-tags .category a, ' +
        '[class*="category"] a, .breadcrumbs .crumb:last-child a'
      );
      if (categoryEl) {
        data.category = categoryEl.textContent?.trim() || '';
      }

      // 提取作者信息
      const authorEl = document.querySelector(
        '.author-info, .uploader-info, .channel-name, ' +
        '.video-uploader, .video-author, ' +
        '.video-info .uploader, [class*="author"]'
      );
      if (authorEl) {
        data.author.name = authorEl.textContent?.trim();
        const avatarEl = document.querySelector(
          '.author-avatar, .uploader-avatar, .channel-avatar img, ' +
          '.author-img, [class*="avatar"] img'
        );
        if (avatarEl) {
          data.author.avatarUrl = avatarEl.src || avatarEl.dataset?.src || '';
        }
      }

      // 提取标签
      const tagEls = document.querySelectorAll(
        '.tag, .video-tag, .keywords a, .video-tags a, ' +
        '[class*="tag"] a, .tag-list a, .tags-section a'
      );
      data.tags = Array.from(tagEls).map(tag => tag.textContent?.trim()).filter(Boolean);

      return data;
    });
    
    // 从网络请求中提取 m3u8 URL
    const streamData = await this.extractStreamFromNetwork();
    if (streamData) {
      videoData.streamUrls = streamData;
    }
    
    this.logger.info(`Video detail scraped: ${videoData.title}`, { id: videoData.id });
    
    return videoData;
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
            // 新视频，需要获取详情
            const detail = await this.scrapeVideoDetail(video.id);
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
        const detail = await this.scrapeVideoDetail(videoId);
        
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
      case 'list':
        // 抓取视频列表
        const videos = await scraper.scrapeVideoList(category);
        console.log(`\n✅ Found ${videos.length} videos`);
        console.log(JSON.stringify(videos.slice(0, 3), null, 2));
        break;
        
      case 'detail':
        // 抓取单个视频详情
        if (!videoId) {
          console.error('Error: --video-id is required for detail mode');
          process.exit(1);
        }
        
        const detail = await scraper.scrapeVideoDetail(videoId);
        
        console.log('\n✅ Video detail:');
        console.log(JSON.stringify({
          id: detail.id,
          title: detail.title,
          duration: detail.duration,
          views: detail.views,
          category: detail.category,
          author: detail.author.name,
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
jable.tv Video Scraper

Usage:
  node index.js --mode=<mode> [options]

Modes:
  list        - Scrape video list from a category page
  detail      - Scrape detailed info for a single video
  category    - Scrape all videos in a category
  full        - Scrape all configured categories
  incremental - Update videos that haven't been updated recently
  help        - Show this help message

Options:
  --mode=<mode>           Operation mode (required)
  --category=<path>       Category path (default: /recent/)
  --max-pages=<num>       Maximum pages to scrape per category (default: 5)
  --video-id=<id>         Video ID for detail mode (required for detail mode)

Examples:
  node index.js --mode=detail --video-id=dldss-460
  node index.js --mode=category --category=/models/ --max-pages=3
  node index.js --mode=incremental
  node index.js --mode=full --max-pages=2
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
