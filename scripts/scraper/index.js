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

    // 先导航到页面
    await this.navigateWithRetry(url);
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 从页面提取内部视频 ID
    const internalVideoId = await this.page.evaluate(() => {
      let internalId = null;

      // 从 script 标签中查找视频配置
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        const videoIdMatch = content.match(/video_id\s*[:=]\s*["']?(\d+)["']?/);
        if (videoIdMatch) {
          internalId = videoIdMatch[1];
          break;
        }
        const contentIdMatch = content.match(/contentId\s*[:=]\s*["']?(\d+)["']?/);
        if (contentIdMatch) {
          internalId = contentIdMatch[1];
          break;
        }
        const internalIdMatch = content.match(/internal_id\s*[:=]\s*["']?(\d+)["']?/);
        if (internalIdMatch) {
          internalId = internalIdMatch[1];
          break;
        }
      }

      return internalId;
    });

    this.logger.info(`Extracted internal video ID: ${internalVideoId}`);

    // 然后收集 m3u8 URL
    const streamData = await this.collectStreamUrlsDuringNavigation(url, internalVideoId);

    // 重新评分选择（如果只有一个 URL，不需要重新选择）
    if (streamData.backups && streamData.backups.length > 0 && internalVideoId) {
      const allUrls = [streamData.primary, ...streamData.backups];

      // 使用内部视频 ID 重新评分
      const scoredUrls = allUrls.map(u => {
        let score = 0;

        // 域名优先级
        score += getDomainPriority(u) * 100;

        // 清晰度分数
        const qualityMatch = u.match(/_(\d+)p/);
        if (qualityMatch) {
          score += parseInt(qualityMatch[1]);
        }

        // 最关键：包含内部视频 ID 的 URL 优先（最高加分）
        if (internalVideoId && u.includes(internalVideoId)) {
          score += 200;
          this.logger.debug(`URL contains internal video ID ${internalVideoId}: ${u.substring(0, 80)}`);
        }

        // URL 路径包含 /56000/ 模式（jable 视频 ID 模式）
        if (u.match(/\/56000\/\d+/)) {
          score += 50;
        }

        return { url: u, score };
      });

      scoredUrls.sort((a, b) => b.score - a.score);
      const bestUrl = scoredUrls[0].url;

      if (bestUrl !== streamData.primary) {
        this.logger.info(`Re-selected stream URL using internal video ID: ${bestUrl.substring(0, 80)}...`);
        streamData.primary = bestUrl;
        streamData.url = bestUrl;
        streamData.backups = scoredUrls.filter(u => u.url !== bestUrl).map(u => u.url);
      }
    }

    // 然后提取其他元数据
    const videoData = await this.page.evaluate(() => {
      const data = {
        id: null,
        internalVideoId: null,
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

      // 尝试提取内部视频 ID
      let internalVideoId = null;

      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        const videoIdMatch = content.match(/video_id\s*[:=]\s*["']?(\d+)["']?/);
        if (videoIdMatch) {
          internalVideoId = videoIdMatch[1];
          break;
        }
        const contentIdMatch = content.match(/contentId\s*[:=]\s*["']?(\d+)["']?/);
        if (contentIdMatch) {
          internalVideoId = contentIdMatch[1];
          break;
        }
      }
      data.internalVideoId = internalVideoId;

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
    
    // 使用已收集的 streamData
    if (streamData && streamData.primary) {
      videoData.streamUrls = {
        primary: streamData.primary,
        url: streamData.url,
        backups: streamData.backups || [],
        qualities: streamData.qualities || {}
      };
    } else {
      videoData.streamUrls = {
        primary: null,
        url: null,
        backups: [],
        qualities: {}
      };
    }
    
    this.logger.info(`Video detail scraped: ${videoData.title}`, { 
      id: videoData.id,
      hasStream: !!videoData.streamUrls.primary 
    });
    
    return videoData;
  }
  
  /**
   * 收集页面中的 m3u8 URL（在导航期间）
   * 改进版：智能区分主视频和广告，选择正确的播放地址
   * @param {string} navigateUrl - 导航的 URL
   * @param {string} internalVideoId - 从页面提取的内部视频 ID
   */
  async collectStreamUrlsDuringNavigation(navigateUrl, internalVideoId = null) {
    return new Promise(async (resolve) => {
      const allM3u8Urls = [];
      const qualityUrls = {};

      // 从当前导航 URL 中提取视频 ID
      const videoIdMatch = navigateUrl.match(/jable\.tv\/videos\/([^\/]+)/);
      const targetVideoId = videoIdMatch ? videoIdMatch[1] : null;

      // 排除已知广告/非视频模式
      const adPatterns = [
        /ad[s]?\//i,
        /promo/i,
        /click-?track/i,
        /tracking/i,
        /vast/i,
        /ima[d]\./i,
        /doubleclick/i,
        /googlesyndication/i,
        /adz\//i,
        /pre-?roll/i,
        /mid-?roll/i,
        /post-?roll/i,
        /companion/i,
        /overlay/i,
        /vast/i,
        /vpaid/i,
        /outstream/i,
      ];

      // 视频域名优先级（越高越可能是主视频）
      // mushroomtrack.com 优先级最高，因为包含正确的内部视频 ID
      const videoDomainPriority = {
        'mushroomtrack.com': 15,
        'akamaized.net': 10,
        'akamaized.live': 10,
        'akuma.tv': 9,
        'saawsedge.com': 8,
        'media-hls.com': 7,
        'cloudfront.net': 6,
        'fastly.net': 5,
      };

      const isAdUrl = (url) => {
        return adPatterns.some(pattern => pattern.test(url));
      };

      const getDomainPriority = (url) => {
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname.toLowerCase();
          // 检查完整主机名
          if (videoDomainPriority[hostname]) {
            return videoDomainPriority[hostname];
          }
          // 检查部分匹配
          for (const [domain, priority] of Object.entries(videoDomainPriority)) {
            if (hostname.includes(domain)) {
              return priority;
            }
          }
          return 1; // 默认优先级
        } catch {
          return 1;
        }
      };

      const requestListener = (request) => {
        const url = request.url();

        // 1. 必须是 m3u8 文件
        if (!url.includes('.m3u8')) return;

        // 2. 排除广告 URL
        if (isAdUrl(url)) {
          this.logger.debug(`Skipping ad URL: ${url}`);
          return;
        }

        // 3. 必须包含目标视频域名模式之一
        if (!(
          url.includes('mushroomtrack') ||
          url.includes('akuma') ||
          url.includes('saawsedge') ||
          url.includes('media-hls') ||
          url.includes('akamaized') ||
          url.includes('fastly') ||
          url.includes('cloudfront')
        )) {
          return;
        }

        // 4. 排除 master/索引文件，只选择实际视频流文件
        // master.m3u8 只是索引，需要二次请求才能获取实际片段
        if (url.includes('/master/') || url.includes('/master.m3u8')) {
          this.logger.debug(`Skipping master playlist: ${url}`);
          return;
        }

        const qualityMatch = url.match(/_(\d+)p/);
        const quality = qualityMatch ? `${qualityMatch[1]}p` : 'unknown';

        if (!allM3u8Urls.includes(url)) {
          allM3u8Urls.push(url);

          if (quality !== 'unknown') {
            if (!qualityUrls[quality]) {
              qualityUrls[quality] = [];
            }
            if (!qualityUrls[quality].includes(url)) {
              qualityUrls[quality].push(url);
            }
          }

          this.logger.debug(`Found m3u8 URL`, { url, quality, videoId: targetVideoId });
        }
      };

      // 先添加监听器
      this.page.on('request', requestListener);

      // 然后导航
      await this.navigateWithRetry(navigateUrl);

      // 等待页面加载
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});

      // 移除监听器
      this.page.removeListener('request', requestListener);

      let result = { primary: null, url: null, backups: [], qualities: {} };

      if (allM3u8Urls.length > 0) {
        // 智能选择主视频 URL
        let primaryUrl = null;

        if (allM3u8Urls.length === 1) {
          // 只有一个 URL，直接使用
          primaryUrl = allM3u8Urls[0];
        } else {
          // 多个 URL，使用评分系统选择最佳主视频
          const scoredUrls = allM3u8Urls.map(url => {
            let score = 0;

            // 基础分数：域名优先级
            score += getDomainPriority(url) * 100;

            // 清晰度分数（越高越好）
            const qualityMatch = url.match(/_(\d+)p/);
            if (qualityMatch) {
              score += parseInt(qualityMatch[1]);
            }

            // 额外加分：优先使用包含视频 ID 的 URL
            if (targetVideoId && url.toLowerCase().includes(targetVideoId.toLowerCase())) {
              score += 50;
            }

            // 额外加分：优先使用 b-hls-* 路径（实际视频流）
            if (url.includes('/b-hls-')) {
              score += 30;
            }

            // 额外加分：包含具体清晰度标识
            if (url.match(/\/\d+\//)) {
              score += 20;
            }

            return { url, score };
          });

          // 按分数降序排序
          scoredUrls.sort((a, b) => b.score - a.score);

          // 选择最高分的 URL 作为主地址
          primaryUrl = scoredUrls[0].url;

          this.logger.debug(`Selected primary URL from ${allM3u8Urls.length} candidates`, {
            selected: primaryUrl,
            allScores: scoredUrls.map(u => ({ url: u.url.substring(0, 80), score: u.score }))
          });
        }

        const backups = allM3u8Urls.filter(u => u !== primaryUrl);

        result = {
          primary: primaryUrl,
          url: primaryUrl,
          backups: backups,
          qualities: qualityUrls
        };

        this.logger.info(`Selected stream URL: ${primaryUrl.substring(0, 100)}...`, {
          hasBackups: backups.length > 0,
          qualities: Object.keys(qualityUrls)
        });
      }

      this.logger.debug(`Collected ${allM3u8Urls.length} m3u8 URLs`,
        allM3u8Urls.length > 0 ? { qualities: Object.keys(qualityUrls) } : {}
      );

      resolve(result);
    });
  }
  
  /**
   * 从网络请求中提取 m3u8 URL（旧方法，已废弃）
   */
  async extractStreamFromNetwork() {
    try {
      // 收集所有 m3u8 URL
      const allM3u8Urls = [];
      const qualityUrls = {};
      
      // 创建 Promise 来等待收集完成
      const collectPromise = new Promise((resolve) => {
        // 监听所有网络请求，收集 m3u8 URL
        const requestListener = (request) => {
          const url = request.url();
          if (url.includes('.m3u8') && 
              (url.includes('akuma') || 
               url.includes('saawsedge') || 
               url.includes('media-hls'))) {
            // 从 URL 中识别清晰度
            const qualityMatch = url.match(/_(\d+)p/);
            const quality = qualityMatch ? `${qualityMatch[1]}p` : 'unknown';
            
            // 避免重复
            if (!allM3u8Urls.includes(url)) {
              allM3u8Urls.push(url);
              
              // 按清晰度分类
              if (quality !== 'unknown') {
                if (!qualityUrls[quality]) {
                  qualityUrls[quality] = [];
                }
                if (!qualityUrls[quality].includes(url)) {
                  qualityUrls[quality].push(url);
                }
              }
              
              this.logger.debug(`Found m3u8 URL`, { url, quality });
            }
          }
        };
        
        this.page.on('request', requestListener);
        
        // 等待一段时间收集请求
        setTimeout(() => {
          this.page.removeListener('request', requestListener);
          resolve();
        }, 10000); // 等待 10 秒
      });
      
      // 等待页面加载完成
      await this.page.waitForLoadState('networkidle').catch(() => {});
      
      // 额外等待以捕获异步请求
      await this.page.waitForTimeout(2000);
      
      // 等待收集完成
      await collectPromise;
      
      this.logger.debug(`Collected ${allM3u8Urls.length} m3u8 URLs`, { 
        qualities: Object.keys(qualityUrls)
      });
      
      if (allM3u8Urls.length === 0) {
        return { primary: null, url: null, backups: [], qualities: {} };
      }
      
      // 选择最佳质量（最高清晰度）的 URL 作为主地址
      const sortedQualities = Object.keys(qualityUrls).sort((a, b) => {
        return parseInt(b) - parseInt(a); // 从高到低排序
      });
      
      let primaryUrl = allM3u8Urls[0];
      
      if (sortedQualities.length > 0) {
        // 选择最高清晰度
        const bestQuality = sortedQualities[0];
        primaryUrl = qualityUrls[bestQuality][0];
      }
      
      // 收集备用 URL（排除主地址）
      const backups = allM3u8Urls.filter(url => url !== primaryUrl);
      
      return {
        primary: primaryUrl,
        url: primaryUrl,
        backups: backups,
        qualities: qualityUrls
      };
      
    } catch (error) {
      this.logger.warn('Failed to extract stream URL', { error: error.message });
      return { primary: null, url: null, backups: [], qualities: {} };
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
