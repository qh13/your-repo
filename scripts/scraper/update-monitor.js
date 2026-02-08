/**
 * jable.tv 视频更新频率测试脚本
 * 
 * 功能：
 * 1. 定期检测视频信息的更新情况
 * 2. 追踪标题、封面图片、播放地址等的变化
 * 3. 生成详细的更新频率报告
 * 4. 支持多种检测模式和通知方式
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// 配置
const CONFIG = {
  // 输出配置
  OUTPUT_DIR: './data/update-monitor',
  HISTORY_DIR: './data/update-monitor/history',
  REPORT_DIR: './data/update-monitor/reports',
  LOG_FILE: './data/update-monitor/update-monitor.log',
  
  // jable.tv 配置
  BASE_URL: 'https://jable.tv',
  TIMEOUT: 60000,
  
  // 测试配置
  DEFAULT_VIDEO_IDS: [
    'mmkz-161',  // 示例视频
    'mmkz-159',  // 另一个示例视频
    'sssr-208',  // 可以添加更多
  ],
  
  // 检测配置
  CHECK_INTERVAL: 300000,  // 默认5分钟检查一次
  RETRY_TIMES: 3,         // 重试次数
  RETRY_DELAY: 3000,      // 重试间隔
  
  // 要监控的字段
  MONITOR_FIELDS: [
    'title',          // 标题
    'description',    // 描述
    'coverUrl',       // 封面图片
    'duration',       // 时长
    'views',          // 观看次数
    'publishDate',   // 发布日期
    'category',       // 分类
    'tags',           // 标签
    'author.name',    // 作者名称
    'author.avatar',  // 作者头像
    'streamUrl',      // 播放地址
    'streamUrls',     // 所有播放源
  ],
};

// 日志系统
class Logger {
  constructor(config) {
    this.config = config;
    this.logs = [];
    this.ensureDirectories();
  }
  
  ensureDirectories() {
    fs.ensureDirSync(path.dirname(this.config.LOG_FILE));
    fs.ensureDirSync(this.config.HISTORY_DIR);
    fs.ensureDirSync(this.config.REPORT_DIR);
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
      success: '\x1b[35m',
    };
    const color = colors[level] || '\x1b[0m';
    console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${data ? JSON.stringify(data) : ''}\x1b[0m`);
  }
  
  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
  debug(message, data) { this.log('debug', message, data); }
  success(message, data) { this.log('success', message, data); }
  
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
class MonitorStorage {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.videoHistory = new Map();  // 视频ID -> 历史记录数组
    this.loadHistory();
  }
  
  loadHistory() {
    try {
      const historyFile = path.join(this.config.HISTORY_DIR, 'monitor-history.json');
      if (fs.existsSync(historyFile)) {
        const data = fs.readJsonSync(historyFile);
        Object.entries(data).forEach(([id, history]) => {
          this.videoHistory.set(id, history);
        });
        this.logger.info(`Loaded history for ${this.videoHistory.size} videos`);
      }
    } catch (error) {
      this.logger.warn('Failed to load history', { error: error.message });
    }
  }
  
  saveHistory() {
    try {
      const historyFile = path.join(this.config.HISTORY_DIR, 'monitor-history.json');
      const data = Object.fromEntries(this.videoHistory);
      fs.writeJsonSync(historyFile, data, { spaces: 2 });
      this.logger.debug('History saved');
    } catch (error) {
      this.logger.error('Failed to save history', { error: error.message });
    }
  }
  
  getVideoHistory(videoId) {
    return this.videoHistory.get(videoId) || [];
  }
  
  addToHistory(videoId, data) {
    if (!this.videoHistory.has(videoId)) {
      this.videoHistory.set(videoId, []);
    }
    
    const history = this.videoHistory.get(videoId);
    const entry = {
      timestamp: new Date().toISOString(),
      ...data,
    };
    
    history.push(entry);
    
    // 只保留最近100条记录
    if (history.length > 100) {
      history.shift();
    }
    
    this.saveHistory();
  }
  
  getLatestData(videoId) {
    const history = this.getVideoHistory(videoId);
    if (history.length === 0) return null;
    return history[history.length - 1];
  }
}

// 视频更新检测器
class UpdateDetector {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }
  
  // 深度比较两个对象，找出变化的字段
  compare(oldData, newData, fields = null) {
    if (!oldData || !newData) {
      return { changed: true, changes: [], hasStreamChange: false };
    }
    
    const changes = [];
    const fieldsToCheck = fields || this.config.MONITOR_FIELDS;
    let hasStreamChange = false;
    
    for (const field of fieldsToCheck) {
      const oldValue = this.getNestedValue(oldData, field);
      const newValue = this.getNestedValue(newData, field);
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        // 检查是否是播放地址变化
        const isStreamField = field.includes('stream') || field.includes('m3u8');
        if (isStreamChange) {
          hasStreamChange = true;
        }
        
        changes.push({
          field,
          oldValue: this.truncateValue(oldValue),
          newValue: this.truncateValue(newValue),
          changed: true,
        });
      }
    }
    
    return {
      changed: changes.length > 0,
      changes,
      hasStreamChange,
      changeCount: changes.length,
    };
  }
  
  // 获取嵌套字段值
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : null, obj
    );
  }
  
  // 截断长值以便显示
  truncateValue(value, maxLength = 200) {
    if (value === null || value === undefined) return value;
    const str = JSON.stringify(value);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '...';
    }
    return value;
  }
  
  // 计算更新频率统计
  calculateUpdateFrequency(history) {
    if (history.length < 2) {
      return {
        totalUpdates: 0,
        averageUpdateInterval: null,
        lastUpdateTime: null,
        updatePattern: 'insufficient_data',
      };
    }
    
    const updates = [];
    const fieldUpdates = {};
    
    for (let i = 1; i < history.length; i++) {
      const result = this.compare(history[i - 1].data, history[i].data);
      if (result.changed) {
        updates.push({
          timestamp: history[i].timestamp,
          hasStreamChange: result.hasStreamChange,
          changeCount: result.changeCount,
        });
        
        // 统计每个字段的更新次数
        result.changes.forEach(change => {
          if (!fieldUpdates[change.field]) {
            fieldUpdates[change.field] = 0;
          }
          fieldUpdates[change.field]++;
        });
      }
    }
    
    // 计算平均更新间隔
    let averageInterval = null;
    if (updates.length >= 2) {
      const intervals = [];
      for (let i = 1; i < updates.length; i++) {
        const t1 = new Date(updates[i - 1].timestamp).getTime();
        const t2 = new Date(updates[i].timestamp).getTime();
        intervals.push((t2 - t1) / 1000 / 60);  // 转换为分钟
      }
      averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }
    
    return {
      totalUpdates: updates.length,
      averageUpdateInterval: averageInterval ? `${averageInterval.toFixed(2)} minutes` : null,
      lastUpdateTime: updates.length > 0 ? updates[updates.length - 1].timestamp : null,
      fieldUpdateCounts: fieldUpdates,
      updatePattern: updates.length > 0 ? 'active' : 'stable',
      streamUpdateCount: updates.filter(u => u.hasStreamChange).length,
      changeDetails: updates.slice(-5),  // 最近5次更新详情
    };
  }
}

// jable.tv 抓取器
class JableVideoFetcher {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
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
    
    this.logger.info('Browser initialized');
  }
  
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.logger.info('Browser closed');
    }
  }
  
  async fetchVideoInfo(videoId) {
    const url = `${this.config.BASE_URL}/videos/${videoId}/`;
    this.logger.info(`Fetching video info: ${videoId}`);
    
    // 重试机制
    for (let attempt = 1; attempt <= this.config.RETRY_TIMES; attempt++) {
      try {
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 45000,
        });
        
        // 等待页面主要内容加载
        await this.page.waitForTimeout(3000);
        
        // 提取视频信息
        const data = await this.page.evaluate(() => {
          const result = {
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
              avatar: '',
            },
            tags: [],
            streamUrl: null,
            streamUrls: [],
            pageHtml: null,
            fetchedAt: new Date().toISOString(),
          };
          
          // 提取视频ID
          const urlMatch = window.location.href.match(/jable\.tv\/videos\/([^\/]+)/);
          if (urlMatch) {
            result.id = urlMatch[1];
          }
          
          // 提取标题
          const titleEl = document.querySelector('h1.video-title, h1.title, meta[property="og:title"]');
          if (titleEl) {
            result.title = titleEl.tagName === 'META' 
              ? titleEl.getAttribute('content')?.trim() || ''
              : titleEl.textContent?.trim() || '';
          }
          
          // 提取描述
          const descEl = document.querySelector('.video-description, meta[property="og:description"]');
          if (descEl) {
            result.description = descEl.tagName === 'META'
              ? descEl.getAttribute('content')?.trim() || ''
              : descEl.textContent?.trim() || '';
          }
          
          // 提取封面
          const coverEl = document.querySelector('.cover-img, meta[property="og:image"]');
          if (coverEl) {
            result.coverUrl = coverEl.tagName === 'META'
              ? coverEl.getAttribute('content') || ''
              : coverEl.src || coverEl.dataset?.src || '';
          }
          
          // 提取时长
          const durationEl = document.querySelector('.duration, .video-duration');
          if (durationEl) {
            result.duration = durationEl.textContent?.trim() || '';
          }
          
          // 提取观看次数
          const viewsEl = document.querySelector('.views, .view-count');
          if (viewsEl) {
            result.views = viewsEl.textContent?.trim() || '';
          }
          
          // 提取发布日期
          const dateEl = document.querySelector('.publish-date, .upload-date');
          if (dateEl) {
            result.publishDate = dateEl.textContent?.trim() || '';
          }
          
          // 提取分类
          const categoryEl = document.querySelector('.category a, .video-category a');
          if (categoryEl) {
            result.category = categoryEl.textContent?.trim() || '';
          }
          
          // 提取作者
          const authorEl = document.querySelector('.author-info, .uploader-info');
          if (authorEl) {
            result.author.name = authorEl.textContent?.trim() || '';
          }
          
          // 提取标签
          const tagEls = document.querySelectorAll('.tag, .video-tag a');
          result.tags = Array.from(tagEls).map(tag => tag.textContent?.trim()).filter(Boolean);
          
          return result;
        });
        
        // 尝试提取m3u8地址
        try {
          const m3u8Request = await this.page.waitForRequest(request => 
            request.url().includes('.m3u8') && 
            (request.url().includes('akuma') || 
             request.url().includes('saawsedge') || 
             request.url().includes('jable') ||
             request.url().includes('media-hls')), 
            { timeout: 10000 }
          ).then(request => request.url()).catch(() => null);
          
          if (m3u8Request) {
            data.streamUrl = m3u8Request;
            data.streamUrls.push(m3u8Request);
          }
        } catch (e) {
          // 没有找到m3u8请求
        }
        
        this.logger.success(`Fetched video info: ${data.title}`);
        
        return data;
        
      } catch (error) {
        this.logger.warn(`Attempt ${attempt}/${this.config.RETRY_TIMES} failed: ${error.message}`);
        
        if (attempt === this.config.RETRY_TIMES) {
          this.logger.error(`All ${this.config.RETRY_TIMES} attempts failed`);
          return {
            id: videoId,
            error: error.message,
            fetchedAt: new Date().toISOString(),
          };
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, this.config.RETRY_DELAY * attempt));
      }
    }
  }
}

// 更新频率监控器
class UpdateFrequencyMonitor {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.storage = new MonitorStorage(config, logger);
    this.detector = new UpdateDetector(config, logger);
    this.fetcher = new JableVideoFetcher(config, logger);
    this.monitoredVideos = new Set(config.DEFAULT_VIDEO_IDS);
    this.isMonitoring = false;
    this.monitorInterval = null;
  }
  
  // 添加要监控的视频
  addVideo(videoId) {
    this.monitoredVideos.add(videoId);
    this.logger.info(`Added video to monitor: ${videoId}`);
  }
  
  // 从视频ID列表添加
  addVideosFromIds(videoIds) {
    videoIds.forEach(id => this.addVideo(id));
  }
  
  // 从视频列表页面自动发现新视频
  async discoverVideosFromCategory(category = '/recent/', maxPages = 3) {
    this.logger.info(`Discovering videos from category: ${category}`);
    
    await this.fetcher.init();
    
    const newVideos = [];
    
    for (let page = 1; page <= maxPages; page++) {
      const url = `${this.config.BASE_URL}${category}page/${page}/`;
      
      try {
        await this.fetcher.page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });
        
        await this.fetcher.page.waitForSelector('.video-item', { timeout: 10000 }).catch(() => null);
        
        const videos = await this.fetcher.page.evaluate(() => {
          const items = document.querySelectorAll('.video-item');
          return Array.from(items).map(item => {
            const link = item.querySelector('a');
            const href = link?.href || '';
            const idMatch = href.match(/jable\.tv\/videos\/([^\/]+)/);
            return idMatch ? idMatch[1] : null;
          }).filter(Boolean);
        });
        
        newVideos.push(...videos);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        this.logger.warn(`Failed to discover page ${page}`, { error: error.message });
      }
    }
    
    // 添加到监控列表
    const uniqueVideos = [...new Set(newVideos)];
    this.logger.info(`Discovered ${uniqueVideos.length} unique videos`);
    this.addVideosFromIds(uniqueVideos);
    
    return uniqueVideos;
  }
  
  // 检查单个视频的更新
  async checkVideo(videoId) {
    this.logger.info(`Checking video: ${videoId}`);
    
    const currentData = await this.fetcher.fetchVideoInfo(videoId);
    if (currentData.error) {
      return {
        videoId,
        status: 'error',
        error: currentData.error,
      };
    }
    
    const previousData = this.storage.getLatestData(videoId);
    const comparison = this.detector.compare(previousData?.data, currentData);
    
    const result = {
      videoId,
      status: comparison.changed ? 'updated' : 'unchanged',
      timestamp: currentData.fetchedAt,
      changes: comparison.changes,
      hasStreamChange: comparison.hasStreamChange,
      data: currentData,
    };
    
    // 保存到历史
    this.storage.addToHistory(videoId, currentData);
    
    if (comparison.changed) {
      this.logger.success(`Video updated: ${videoId}`, {
        changes: comparison.changes.map(c => c.field).join(', '),
        hasStreamChange: comparison.hasStreamChange,
      });
    } else {
      this.logger.debug(`Video unchanged: ${videoId}`);
    }
    
    return result;
  }
  
  // 检查所有监控的视频
  async checkAllVideos() {
    this.logger.info(`Checking ${this.monitoredVideos.size} videos...`);
    
    const results = [];
    
    for (const videoId of this.monitoredVideos) {
      const result = await this.checkVideo(videoId);
      results.push(result);
      
      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 统计结果
    const stats = {
      total: results.length,
      updated: results.filter(r => r.status === 'updated').length,
      unchanged: results.filter(r => r.status === 'unchanged').length,
      error: results.filter(r => r.status === 'error').length,
      streamUpdated: results.filter(r => r.hasStreamChange).length,
      timestamp: new Date().toISOString(),
    };
    
    this.logger.info(`Check complete: ${stats.updated} updated, ${stats.unchanged} unchanged, ${stats.error} errors`);
    
    return { results, stats };
  }
  
  // 开始持续监控
  async startMonitoring(interval = null) {
    this.interval = interval || this.config.CHECK_INTERVAL;
    this.isMonitoring = true;
    
    this.logger.success(`Started monitoring ${this.monitoredVideos.size} videos (interval: ${this.interval / 1000}s)`);
    
    // 立即执行一次检查
    await this.checkAllVideos();
    
    // 设置定时检查
    this.monitorInterval = setInterval(async () => {
      if (!this.isMonitoring) return;
      await this.checkAllVideos();
    }, this.interval);
  }
  
  // 停止监控
  stopMonitoring() {
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.logger.info('Monitoring stopped');
  }
  
  // 生成更新频率报告
  generateReport(videoId = null) {
    this.logger.info('Generating update frequency report...');
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalVideosMonitored: this.monitoredVideos.size,
        totalHistoryEntries: this.storage.videoHistory.size,
      },
      videoReports: [],
    };
    
    const videosToReport = videoId 
      ? [videoId] 
      : Array.from(this.monitoredVideos);
    
    for (const vid of videosToReport) {
      const history = this.storage.getVideoHistory(vid);
      const frequency = this.detector.calculateUpdateFrequency(history);
      const latestData = this.storage.getLatestData(vid);
      
      const videoReport = {
        videoId: vid,
        url: `${this.config.BASE_URL}/videos/${vid}/`,
        latestData: latestData ? {
          title: latestData.data?.title,
          duration: latestData.data?.duration,
          views: latestData.data?.views,
          fetchedAt: latestData.timestamp,
        } : null,
        updateFrequency: frequency,
        monitoringHistory: {
          totalChecks: history.length,
          firstCheck: history[0]?.timestamp || null,
          lastCheck: history[history.length - 1]?.timestamp || null,
        },
      };
      
      report.videoReports.push(videoReport);
    }
    
    // 生成文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(this.config.REPORT_DIR, `update-report-${timestamp}.json`);
    fs.writeJsonSync(reportFile, report, { spaces: 2 });
    
    // 同时生成人类可读的Markdown报告
    const markdownReport = this.generateMarkdownReport(report);
    const mdFile = path.join(this.config.REPORT_DIR, `update-report-${timestamp}.md`);
    fs.writeFileSync(mdFile, markdownReport);
    
    this.logger.success(`Reports generated: ${reportFile}, ${mdFile}`);
    
    return { json: report, markdown: markdownReport, files: [reportFile, mdFile] };
  }
  
  // 生成Markdown格式的报告
  generateMarkdownReport(report) {
    let md = `# jable.tv 视频更新频率报告\n`;
    md += `生成时间: ${report.generatedAt}\n\n`;
    
    md += `## 概览\n`;
    md += `- 监控视频数量: ${report.summary.totalVideosMonitored}\n`;
    md += `- 有历史记录的视频: ${report.summary.totalHistoryEntries}\n\n`;
    
    for (const videoReport of report.videoReports) {
      md += `## 视频: ${videoReport.videoId}\n`;
      md += `- 链接: ${videoReport.url}\n`;
      
      if (videoReport.latestData) {
        md += `- 最新标题: ${videoReport.latestData.title}\n`;
        md += `- 最新时长: ${videoReport.latestData.duration}\n`;
        md += `- 最新观看数: ${videoReport.latestData.views}\n`;
        md += `- 最后检查: ${videoReport.latestData.fetchedAt}\n`;
      }
      
      md += `\n### 更新频率统计\n`;
      md += `- 总检查次数: ${videoReport.monitoringHistory.totalChecks}\n`;
      md += `- 检测到更新次数: ${videoReport.updateFrequency.totalUpdates}\n`;
      md += `- 播放地址更新次数: ${videoReport.updateFrequency.streamUpdateCount}\n`;
      
      if (videoReport.updateFrequency.averageUpdateInterval) {
        md += `- 平均更新间隔: ${videoReport.updateFrequency.averageUpdateInterval}\n`;
      }
      
      md += `- 更新模式: ${videoReport.updateFrequency.updatePattern}\n`;
      
      if (videoReport.updateFrequency.fieldUpdateCounts && Object.keys(videoReport.updateFrequency.fieldUpdateCounts).length > 0) {
        md += `\n### 字段更新统计\n`;
        Object.entries(videoReport.updateFrequency.fieldUpdateCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([field, count]) => {
            md += `- ${field}: ${count} 次\n`;
          });
      }
      
      md += `\n---\n\n`;
    }
    
    return md;
  }
  
  // 获取快速摘要
  getQuickSummary() {
    const summary = {
      monitoredVideos: this.monitoredVideos.size,
      historySize: this.storage.videoHistory.size,
      timestamp: new Date().toISOString(),
      videoStatuses: [],
    };
    
    for (const videoId of this.monitoredVideos) {
      const history = this.storage.getVideoHistory(videoId);
      const latest = this.storage.getLatestData(videoId);
      const frequency = this.detector.calculateUpdateFrequency(history);
      
      summary.videoStatuses.push({
        videoId,
        latestTitle: latest?.data?.title || 'Unknown',
        lastCheck: latest?.timestamp || 'Never',
        totalChecks: history.length,
        updateCount: frequency.totalUpdates,
        streamUpdates: frequency.streamUpdateCount,
        status: frequency.updatePattern,
      });
    }
    
    return summary;
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options = {
    videoId: args.find(arg => arg.startsWith('--video-id='))?.split('=')[1],
    videoIds: args.find(arg => arg.startsWith('--video-ids='))?.split('=')[1]?.split(','),
    interval: parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || CONFIG.CHECK_INTERVAL,
    pages: parseInt(args.find(arg => arg.startsWith('--pages='))?.split('=')[1]) || 3,
    category: args.find(arg => arg.startsWith('--category='))?.split('=')[1] || '/recent/',
  };
  
  // 初始化
  const logger = new Logger(CONFIG);
  const monitor = new UpdateFrequencyMonitor(CONFIG, logger);
  
  try {
    await monitor.fetcher.init();
    
    switch (command) {
      case 'check':
        // 检查单个视频
        if (options.videoId) {
          const result = await monitor.checkVideo(options.videoId);
          console.log('\n✅ 检查结果:', JSON.stringify(result, null, 2));
        } else {
          console.error('Error: --video-id is required');
        }
        break;
        
      case 'check-all':
        // 检查所有监控的视频
        const allResults = await monitor.checkAllVideos();
        console.log('\n✅ 检查完成:');
        console.log(`总视频数: ${allResults.stats.total}`);
        console.log(`有更新: ${allResults.stats.updated}`);
        console.log(`无变化: ${allResults.stats.unchanged}`);
        console.log(`错误: ${allResults.stats.error}`);
        console.log(`播放地址更新: ${allResults.stats.streamUpdated}`);
        break;
        
      case 'add':
        // 添加视频到监控列表
        if (options.videoId) {
          monitor.addVideo(options.videoId);
          console.log(`✅ 已添加视频: ${options.videoId}`);
        } else if (options.videoIds) {
          monitor.addVideosFromIds(options.videoIds);
          console.log(`✅ 已添加视频: ${options.videoIds.join(', ')}`);
        }
        break;
        
      case 'discover':
        // 从分类页面发现新视频
        await monitor.discoverVideosFromCategory(options.category, options.pages);
        console.log(`✅ 发现完成，当前监控 ${monitor.monitoredVideos.size} 个视频`);
        break;
        
      case 'monitor':
        // 开始持续监控
        await monitor.startMonitoring(options.interval);
        
        // 处理退出信号
        process.on('SIGINT', async () => {
          console.log('\n🛑 停止监控...');
          monitor.stopMonitoring();
          await monitor.fetcher.close();
          logger.flushLogs();
          process.exit(0);
        });
        
        // 保持运行
        console.log('\n🔄 正在监控中，按 Ctrl+C 停止...');
        await new Promise(() => {});  // 永久等待
        break;
        
      case 'report':
        // 生成报告
        const report = monitor.generateReport(options.videoId);
        console.log('\n✅ 报告已生成:');
        report.files.forEach(file => console.log(`  - ${file}`));
        console.log('\n📊 摘要:');
        console.log(JSON.stringify(monitor.getQuickSummary(), null, 2));
        break;
        
      case 'summary':
        // 快速摘要
        console.log('\n📊 当前监控状态:');
        console.log(JSON.stringify(monitor.getQuickSummary(), null, 2));
        break;
        
      case 'history':
        // 查看历史记录
        if (options.videoId) {
          const history = monitor.storage.getVideoHistory(options.videoId);
          console.log(`\n📜 ${options.videoId} 的历史记录 (${history.length} 条):`);
          history.forEach((entry, i) => {
            console.log(`${i + 1}. [${entry.timestamp}] ${entry.data?.title || 'Unknown'}`);
          });
        } else {
          console.error('Error: --video-id is required');
        }
        break;
        
      case 'help':
      default:
        console.log(`
jable.tv 视频更新频率监控脚本

用法:
  node update-monitor.js <command> [options]

命令:
  check          - 检查单个视频的更新情况
  check-all      - 检查所有监控的视频
  add            - 添加视频到监控列表
  discover       - 从分类页面发现并添加新视频
  monitor        - 开始持续监控（定期检查更新）
  report         - 生成更新频率报告
  summary        - 显示快速摘要
  history        - 查看视频历史记录
  help           - 显示此帮助信息

选项:
  --video-id=<id>      单个视频ID (如 mmkz-161)
  --video-ids=<ids>    逗号分隔的视频ID列表
  --interval=<ms>      监控间隔毫秒数 (默认: ${CONFIG.CHECK_INTERVAL})
  --category=<path>    分类路径 (默认: /recent/)
  --pages=<num>        发现新视频的页数 (默认: 3)

示例:
  # 检查单个视频
  node update-monitor.js check --video-id=mmkz-161
  
  # 检查所有视频
  node update-monitor.js check-all
  
  # 添加视频到监控
  node update-monitor.js add --video-id=sssr-208
  node update-monitor.js add --video-ids=mmkz-161,mmkz-159,sssr-208
  
  # 从分类发现新视频
  node update-monitor.js discover --category=/recent/ --pages=5
  
  # 开始持续监控（5分钟间隔）
  node update-monitor.js monitor --interval=300000
  
  # 生成报告
  node update-monitor.js report
  node update-monitor.js report --video-id=mmkz-161
  
  # 查看摘要
  node update-monitor.js summary
  
  # 查看历史记录
  node update-monitor.js history --video-id=mmkz-161
`);
        break;
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await monitor.fetcher.close();
    logger.flushLogs();
  }
}

// 导出供其他脚本使用
module.exports = {
  UpdateFrequencyMonitor,
  UpdateDetector,
  MonitorStorage,
  JableVideoFetcher,
  CONFIG,
};

// 如果直接运行
if (require.main === module) {
  main().catch(console.error);
}
