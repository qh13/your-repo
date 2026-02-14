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
  
  // 反爬虫配置
  ANTI_BOT: {
    // 随机延迟配置 (毫秒)
    MIN_DELAY: 2000,      // 最小延迟
    MAX_DELAY: 8000,      // 最大延迟
    PAGE_DELAY_MIN: 1000, // 页面间最小延迟
    PAGE_DELAY_MAX: 3000, // 页面间最大延迟
    
    // User-Agent 轮换
    USER_AGENTS: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    ],
    
    // 随机滚动行为
    ENABLE_RANDOM_SCROLL: true,
    SCROLL_CHANCE: 0.3,  // 30% 概率在页面加载后随机滚动
    
    // 鼠标移动模拟
    ENABLE_MOUSE_MOVES: true,
    
    // 访问来源伪装
    ENABLE_REFERRER_SPOOFING: true,
    
    // 渐进式请求（先访问首页再访问目标页面）
    ENABLE_PROGRESSIVE_LOAD: true,
  },
  
  // 分类列表
  categories: [
    // 热门分类
    '/hot/',
    // 最新更新
    '/latest-updates/',
    // 全新上市
    '/new-release/',
    // 原有分类
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
    this.currentUserAgent = '';
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
  
  // 随机延迟工具方法
  randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return delay;
  }
  
  // 获取随机 User-Agent
  getRandomUserAgent() {
    const userAgents = this.config.ANTI_BOT.USER_AGENTS;
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
  
  // 模拟人类鼠标移动
  async simulateHumanMouse() {
    if (!this.page || !this.config.ANTI_BOT.ENABLE_MOUSE_MOVES) return;
    
    try {
      const box = await this.page.boundingBox();
      if (!box) return;
      
      // 随机生成起点和终点
      const startX = Math.random() * box.width;
      const startY = Math.random() * box.height;
      const endX = Math.random() * box.width;
      const endY = Math.random() * box.height;
      
      // 移动鼠标（分几步移动，更像人类）
      await this.page.mouse.move(startX, startY);
      await this.page.mouse.move(
        startX + (endX - startX) * 0.3,
        startY + (endY - startY) * 0.3,
        { steps: Math.floor(Math.random() * 5) + 2 }
      );
      await this.page.mouse.move(endX, endY, { steps: Math.floor(Math.random() * 5) + 2 });
    } catch (error) {
      // 忽略鼠标移动错误
    }
  }
  
  // 模拟随机滚动
  async simulateRandomScroll() {
    if (!this.page || !this.config.ANTI_BOT.ENABLE_RANDOM_SCROLL) return;
    
    try {
      // 随机滚动一段距离
      const scrollHeight = await this.page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await this.page.evaluate(() => window.innerHeight);
      
      if (scrollHeight > viewportHeight) {
        const randomPosition = Math.random() * (scrollHeight - viewportHeight);
        await this.page.evaluate((pos) => {
          window.scrollTo(0, pos);
        }, randomPosition);
        
        // 随机等待一下
        await new Promise(resolve => setTimeout(resolve, this.randomDelay(500, 1500)));
        
        // 滚动回顶部
        await this.page.evaluate(() => window.scrollTo(0, 0));
      }
    } catch (error) {
      // 忽略滚动错误
    }
  }
  
  // 请求间隔控制（避免请求过快）
  async throttleRequests() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // 根据配置计算最小间隔
    const minInterval = this.config.ANTI_BOT.MIN_DELAY;
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest + this.randomDelay(0, 1000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
  
  // 检测是否被反爬
  async detectAntiBot() {
    try {
      // 检查页面是否出现验证码或限制提示
      const pageContent = await this.page.content();
      
      // 检测常见的反爬提示
      const antiBotPatterns = [
        /captcha/i,
        /verify/i,
        /blocked/i,
        /access denied/i,
        /forbidden/i,
        /too many requests/i,
        /rate limit/i,
        /请验证/i,
        /访问受限/i,
      ];
      
      for (const pattern of antiBotPatterns) {
        if (pattern.test(pageContent)) {
          this.logger.warn('Potential anti-bot detection detected');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  async init() {
    this.logger.info('Initializing browser with anti-bot measures...');
    
    // 选择随机 User-Agent
    this.currentUserAgent = this.getRandomUserAgent();
    
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',  // 隐藏自动化特征
      ],
    });
    
    this.page = await this.browser.newPage();
    
    // 设置自定义 User-Agent
    await this.page.setExtraHTTPHeaders({
      'User-Agent': this.currentUserAgent,
    });
    
    // 设置 viewport
    await this.page.setViewportSize({
      width: 1920,
      height: 1080,
    });
    
    // 注入脚本来隐藏 webdriver 属性
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    
    // 设置请求拦截
    await this.setupRequestInterception();
    
    this.logger.info('Browser initialized with anti-bot measures');
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
      // 请求间隔控制
      await this.throttleRequests();
      
      // 渐进式加载：如果启用，先访问首页作为 referrer
      if (this.config.ANTI_BOT.ENABLE_PROGRESSIVE_LOAD && this.requestCount > 1) {
        try {
          // 随机小概率执行渐进式加载
          if (Math.random() < 0.3) {
            await this.page.goto(this.config.BASE_URL, { 
              waitUntil: 'domcontentloaded',
              timeout: 5000 
            }).catch(() => {});
            
            // 随机等待
            await new Promise(resolve => setTimeout(resolve, this.randomDelay(500, 1500)));
          }
        } catch (e) {
          // 忽略渐进式加载错误
        }
      }
      
      // 设置 Referer 头（如果启用）
      const extraHTTPHeaders = {
        ...(this.config.ANTI_BOT.ENABLE_REFERRER_SPOOFING ? {
          'Referer': this.config.BASE_URL + '/',
        } : {}),
      };
      
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.config.PAGE_TIMEOUT,
        ...options,
      });
      
      // 随机滚动（以一定概率）
      if (Math.random() < this.config.ANTI_BOT.SCROLL_CHANCE) {
        await this.simulateRandomScroll();
      }
      
      // 随机鼠标移动
      await this.simulateHumanMouse();
      
      // 检测是否被反爬
      const isBlocked = await this.detectAntiBot();
      if (isBlocked) {
        this.logger.warn('Detected potential anti-bot blocking, rotating User-Agent');
        
        // 更换 User-Agent
        this.currentUserAgent = this.getRandomUserAgent();
        await this.page.setExtraHTTPHeaders({
          'User-Agent': this.currentUserAgent,
        });
        
        // 等待更长时间
        await new Promise(resolve => setTimeout(resolve, this.randomDelay(5000, 10000)));
        
        throw new Error('Anti-bot detection triggered');
      }
    });
  }
  
  /**
   * 抓取视频列表页
   */
  async scrapeVideoList(category = '/recent/', pageNum = 1) {
    // 第一页不需要 page 路径
    const url = pageNum === 1 
      ? `${this.config.BASE_URL}${category}`
      : `${this.config.BASE_URL}${category}page/${pageNum}/`;
    this.logger.info(`Scraping video list: ${url}`);
    
    await this.navigateWithRetry(url);
    
    // 等待视频列表加载 - 新页面结构使用 h1 标题后紧跟的链接
    await this.page.waitForSelector('main a[href*="/videos/"]', { timeout: 10000 }).catch(() => null);
    
    const videos = await this.page.evaluate(() => {
      const results = [];
      
      // 查找所有视频详情页链接
      const allAnchors = document.querySelectorAll('a[href*="/videos/"]');
      
      let currentDuration = '';
      let currentViews = '';
      let currentLikes = '';
      
      // 处理每个链接
      allAnchors.forEach((link, index) => {
        const href = link.href;
        const text = link.textContent?.trim() || '';
        
        // 跳过分页链接和分类链接
        if (href.includes('/hot/') || href.includes('/latest-updates/') || 
            href.includes('/new-release/') || href.includes('/new-release/') ||
            href.includes('/page/') || href.includes('/models/') || 
            href.includes('/categories/') || href.includes('/tags/')) {
          return;
        }
        
        // 检查是否是视频详情页链接
        const videoIdMatch = href.match(/jable\.tv\/videos\/([^\/]+)/);
        if (!videoIdMatch) return;
        
        const videoId = videoIdMatch[1];
        
        // 过滤掉已经是结果的链接（去重）
        if (results.some(r => r.id === videoId)) return;
        
        // 检查是否是时长链接（纯空白或只有时间格式）
        const durationMatch = text.match(/^(\d+:\d{2}(?::\d{2})?)$/);
        
        // 如果是标题链接（有实际内容）
        if (text.length > 0 && !durationMatch) {
          // 获取父级元素来查找统计信息和封面图
          const parent = link.parentElement;
          let views = '';
          let likes = '';
          let coverUrl = '';
          
          if (parent) {
            // 查找所有相邻的链接文本
            const parentLinks = parent.querySelectorAll('a');
            parentLinks.forEach(pl => {
              const plText = pl.textContent?.trim() || '';
              // 观看次数通常是较大的数字（至少4位）
              if (plText.match(/^\d{3,}/) && !plText.includes('/videos/')) {
                if (!views) {
                  views = plText;
                } else if (!likes) {
                  likes = plText;
                }
              }
            });
            
            // 查找封面图 - 多种选择器适配
            const coverSelectors = [
              // 常见的缩略图选择器
              '.thumb-img img',
              '.video-thumb img',
              '.thumb img',
              'img.thumb',
              '.cover-img img',
              '.thumbnail img',
              '[class*="thumb"] img',
              '[class*="cover"] img',
              '[class*="poster"] img',
              // 在链接内的图片
              'a img',
              // 父级的图片
              parent.querySelector('img'),
              // 向前查找兄弟元素中的图片
              ...Array.from(parent.previousElementSibling?.querySelectorAll('img') || []),
            ];
            
            for (const selector of coverSelectors) {
              try {
                let imgEl = null;
                if (typeof selector === 'string') {
                  imgEl = parent.querySelector(selector);
                } else {
                  imgEl = selector;
                }
                
                if (imgEl && imgEl.src) {
                  // 排除 placeholder 或空图片
                  if (imgEl.src && !imgEl.src.includes('data:') && imgEl.src.length > 0) {
                    coverUrl = imgEl.src || imgEl.dataset?.src || imgEl.dataset?.lazy || '';
                    break;
                  }
                }
              } catch (e) {
                // 忽略选择器错误
              }
            }
            
            // 备用方法：从链接本身查找背景图
            if (!coverUrl) {
              const linkStyle = link.style?.backgroundImage || link.parentElement?.style?.backgroundImage;
              if (linkStyle && linkStyle !== 'none') {
                const match = linkStyle.match(/url\(["']?([^"')]+)["']?\)/);
                if (match) {
                  coverUrl = match[1];
                }
              }
            }
          }
          
          results.push({
            id: videoId,
            url: href,
            title: text,
            coverUrl: coverUrl || '',
            duration: currentDuration || '',
            views: views || '',
            likes: likes || '',
          });
          
          // 重置临时变量
          currentDuration = '';
        } else if (durationMatch) {
          // 这是时长链接
          currentDuration = text;
        }
      });
      
      return results;
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
            // 如果列表页没有 coverUrl，但详情页有，保留原有的
            const newCoverUrl = video.coverUrl || existing.coverUrl;
            
            if (existing.title !== video.title || existing.coverUrl !== newCoverUrl) {
              existing.title = video.title;
              existing.coverUrl = newCoverUrl;
              existing.duration = video.duration || existing.duration;
              existing.views = video.views || existing.views;
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
        
        // 避免请求过快 - 使用随机延迟
        const pageDelay = this.randomDelay(
          this.config.ANTI_BOT.PAGE_DELAY_MIN,
          this.config.ANTI_BOT.PAGE_DELAY_MAX
        );
        await new Promise(resolve => setTimeout(resolve, pageDelay));
        
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
        
        // 避免请求过快 - 使用随机延迟
        const delay = this.randomDelay(
          this.config.ANTI_BOT.MIN_DELAY,
          this.config.ANTI_BOT.MAX_DELAY
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        
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
