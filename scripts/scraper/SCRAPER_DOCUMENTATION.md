# Jable.tv 抓取系统完整文档

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           抓取系统架构图                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐                                                       │
│  │  本地运行环境       │  (macOS/本地 Linux)                                   │
│  │  - Playwright    │                                                       │
│  │  - Node.js 18+   │                                                       │
│  │  - scripts/scraper│                                                      │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           │ JSON 文件                                                       │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │  数据存储层        │                                                       │
│  │  - videos.json   │  (本地临时存储)                                         │
│  │  - categories.json│                                                      │
│  │  - scraper.log   │                                                       │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           │ sync-to-d1.js / sync-data.js                                    │
│           ▼                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Cloudflare                                          │  │
│  │  ┌────────────────────┐    ┌─────────────────────────────────────────┐  │  │
│  │  │    Worker          │    │            D1 数据库                    │  │  │
│  │  │  (jable-video-     │    │  - videos 表                            │  │  │
│  │  │   proxy)          │───▶│  - categories 表                        │  │  │
│  │  │  - 视频代理        │    │  - scrape_logs 表                       │  │  │
│  │  │  - m3u8 重写      │◀───│  - CRUD API                            │  │  │
│  │  │  - 缓存层         │    └─────────────────────────────────────────┘  │  │
│  │  └────────────────────┘                                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Next.js 前端                                      │  │
│  │  - 视频列表页                                                            │
│  │  - 视频详情页                                                            │
│  │  - 搜索功能                                                              │
│  │  - 分类浏览                                                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. 运行环境说明

### 2.1 本地运行（抓取脚本）

**位置**: `scripts/scraper/`

**运行要求**:
- Node.js 16+
- Playwright 浏览器（需安装）
- 稳定的网络连接

**启动方式**:
```bash
cd scripts/scraper

# 首次安装依赖
npm install
npx playwright install chromium

# 运行抓取
node index.js --mode=full --max-pages=5
```

### 2.2 Cloudflare Worker（视频代理）

**位置**: `worker/`

**功能**:
- 代理 m3u8 播放列表
- 代理视频分片 (.ts)
- Range 请求支持（视频拖拽播放）
- D1 数据库 CRUD API

**部署方式**:
```bash
cd worker

# 开发测试
npx wrangler dev

# 部署生产
npx wrangler deploy
```

## 3. 抓取流程详解

### 3.1 抓取模式

```javascript
// index.js 中的模式定义
const CONFIG = {
  categories: [
    '/models/',      // 模特分类
    '/recent/',      // 最新发布
    '/top/',         // 热门视频
    // 可添加更多分类
  ],
};
```

| 模式 | 命令 | 说明 |
|------|------|------|
| 列表抓取 | `node index.js --mode=list --category=/recent/` | 抓取单页视频列表 |
| 详情抓取 | `node index.js --mode=detail --video-id=dldss-460` | 抓取单个视频详情 |
| 分类抓取 | `node index.js --mode=category --category=/recent/ --max-pages=5` | 抓取整个分类 |
| 全量抓取 | `node index.js --mode=full --max-pages=3` | 抓取所有配置分类 |
| 增量更新 | `node index.js --mode=incremental` | 更新旧视频信息 |

### 3.2 抓取流程图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         抓取主流程                                       │
└─────────────────────────────────────────────────────────────────────────┘

1. 初始化
   │
   ▼
2. 启动 Playwright 浏览器 (headless)
   │
   ▼
3. 遍历分类列表
   │
   ├──────────────────────────────────────────────┐
   │                                              │
   ▼                                              ▼
4. 抓取列表页                                  增量更新
   │                                              │
   │  ┌─────────────────────────────────────────┐  │
   │  │  解析 .video-item 元素                 │  │
   │  │  - 提取视频 ID, URL, 标题, 封面图       │  │
   │  └─────────────────────────────────────────┘  │
   │                                              │
   ▼                                              ▼
5. 过滤已有视频 ────── 新视频 ──────▶ 抓取详情页
   │                                              │
   │  ┌─────────────────────────────────────────┐  │
   │  │  解析视频详情页                          │  │
   │  │  - 标题, 描述, 时长, 观看次数           │  │
   │  │  - 发布日期, 分类, 作者信息             │  │
   │  │  - 标签, m3u8 流地址                   │  │
   │  └─────────────────────────────────────────┘  │
   │                                              │
   ▼                                              ▼
6. 保存到 videos.json                          7. 同步到 D1
   │                                              │
   ▼                                              ▼
8. 关闭浏览器
```

## 4. 数据字段完整性分析

### 4.1 当前抓取状态

基于 `data/videos.json` 实际数据分析：

| 字段 | 抓取状态 | 示例数据 | 问题说明 |
|------|---------|---------|---------|
| id | ✅ 正常 | `dldss-460` | 从 URL 提取 |
| title | ✅ 正常 | `DLDSS-460 発射しても...` | 正常抓取 |
| description | ❌ 为空 | `""` | 选择器未匹配 |
| coverUrl | ✅ 正常 | `https://assets-cdn.jable.tv/...` | 正常抓取 |
| duration | ❌ 为空 | `""` | 选择器未匹配 |
| views | ❌ 为空 | `""` | 选择器未匹配 |
| publishDate | ❌ 为空 | `""` | 选择器未匹配 |
| category | ❌ 为空 | `""` | 选择器未匹配 |
| author.name | ❌ 为空 | `""` | 选择器未匹配 |
| author.avatarUrl | ❌ 为空 | `""` | 选择器未匹配 |
| tags | ✅ 正常 | `["黑絲", "過膝襪", ...]` | 正常抓取 |
| streamUrls.primary | ⚠️ 待确认 | 未测试 | 需验证 |
| scrapedAt | ✅ 正常 | `2024-...` | 自动记录 |

### 4.2 问题根因分析

jable.tv 网站可能更新了页面结构，导致以下 CSS 选择器失效：

```javascript
// 当前使用的选择器（可能已过时）
const problematicSelectors = {
  title: 'h1.video-title, h1.title, .video-info h1',
  description: '.video-description, .description',
  duration: '.duration, .video-duration',
  views: '.views, .view-count',
  category: '.category a, .video-category a',
  author: '.author-info, .uploader-info',
};
```

需要通过浏览器开发者工具检查实际的 HTML 结构。

## 5. 全量抓取策略设计

### 5.1 推荐抓取策略

```bash
# ============================================
# 建议的定时抓取任务配置
# ============================================

# 每天凌晨 2 点执行全量抓取
0 2 * * * cd /path/to/scripts/scraper && node index.js --mode=full --max-pages=10 >> /var/log/scraper.log 2>&1

# 每 6 小时执行增量更新
0 */6 * * * cd /path/to/scripts/scraper && node index.js --mode=incremental >> /var/log/scraper-incremental.log 2>&1

# 每天凌晨 3 点同步到 D1
0 3 * * * cd /path/to/scripts/scraper && node sync-data.js --api >> /var/log/sync-d1.log 2>&1
```

### 5.2 抓取优先级

```
┌─────────────────────────────────────────────────────────────────────┐
│                        抓取优先级矩阵                                 │
├──────────────────┬─────────────────────────────────────────────────┤
│      分类        │                    抓取策略                       │
├──────────────────┼─────────────────────────────────────────────────┤
│ /recent/         │ 每次抓取，更新所有视频（首页优先展示）             │
│ /top/            │ 每周完整抓取（热门变化较慢）                       │
│ /models/         │ 每月完整抓取（模特信息相对稳定）                   │
│ 自定义分类       │ 按需抓取，手动触发                                │
└──────────────────┴─────────────────────────────────────────────────┘
```

### 5.3 增量更新逻辑

```javascript
// 增量更新策略
const INCREMENTAL_UPDATE_RULES = {
  // 24小时内抓取的不更新
  recentVideosAge: 24 * 60 * 60 * 1000,

  // 普通视频7天更新一次
  regularVideosAge: 7 * 24 * 60 * 60 * 1000,

  // 热门视频3天更新一次
  hotVideosAge: 3 * 24 * 60 * 60 * 1000,
};
```

## 6. 数据同步方式

### 6.1 同步方式对比

| 方式 | 命令 | 适用场景 | 优缺点 |
|------|------|---------|-------|
| Worker API | `node sync-data.js --api` | 网络正常时 | ✓ 实时<br>✗ 依赖网络 |
| wrangler CLI | `node sync-data.js --sql` | 网络不稳定 | ✓ 可靠<br>✗ 需要本地 wrangler |
| 混合模式 | `node sync-data.js` | 默认 | 自动切换 |

### 6.2 同步流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                         数据同步流程                                   │
└─────────────────────────────────────────────────────────────────────┘

  videos.json ──▶ 格式化 ──▶ 批量/单个 ──▶ D1 数据库
                     │
                     ├──▶ API 方式 ──▶ POST /api/admin/save-videos
                     │
                     └──▶ SQL 方式 ──▶ wrangler d1 execute
```

## 7. 常见问题与解决方案

### 7.1 抓取问题排查

```bash
# 1. 检查日志
tail -100 data/scraper.log

# 2. 测试单个视频抓取
node index.js --mode=detail --video-id=dldss-460

# 3. 验证数据完整性
cat data/videos.json | jq '.[] | select(.description == "") | .id'
```

### 7.2 常见错误处理

| 错误类型 | 原因 | 解决方案 |
|---------|------|---------|
| 导航超时 | 网络不稳定 | 自动重试 3 次 |
| 元素未找到 | 网站结构变化 | 更新 CSS 选择器 |
| IP 被封 | 频繁请求 | 添加延时，降低频率 |
| 内存溢出 | 大量数据 | 分批处理，设置上限 |

### 7.3 视频流地址提取

```javascript
// m3u8 URL 提取逻辑
async function extractStreamFromNetwork() {
  // 1. 等待包含 .m3u8 的网络请求
  const m3u8Url = await page.waitForRequest(request =>
    request.url().includes('.m3u8') &&
    (request.url().includes('akuma') ||
     request.url().includes('saawsedge') ||
     request.url().includes('media-hls'))
  );

  // 2. 解析 URL 提取关键信息
  const urlMatch = m3u8Url.match(/\/hls\/([^\/]+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.m3u8/);

  return {
    url: m3u8Url,
    token: urlMatch[1],        // 认证 token
    timestamp: urlMatch[2],    // 时间戳
    folder: urlMatch[3],       // 文件夹
    internalId: urlMatch[4],   // 内部 ID
    format: 'master'           // 主播放列表
  };
}
```

## 8. 优化建议

### 8.1 短期优化（立即可做）

1. **更新 CSS 选择器**
   - 检查 jable.tv 实际 HTML 结构
   - 更新 `scrapeVideoDetail` 函数中的选择器

2. **添加 User-Agent 轮换**
   ```javascript
   const USER_AGENTS = [
     'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
     // ...
   ];
   ```

3. **添加请求延时**
   ```javascript
   // 避免请求过快被封
   await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
   ```

### 8.2 中期优化（1-2周）

1. **Cloudflare Workers Cron**
   - 配置定时抓取任务
   - 自动增量更新

2. **添加代理支持**
   - 使用代理池
   - 降低 IP 被封风险

3. **数据验证**
   - 抓取后校验字段完整性
   - 失败时重新尝试

### 8.3 长期优化（1个月+）

1. **分布式抓取**
   - 多节点并行抓取
   - 结果合并

2. **机器学习选择器**
   - 自动适应网站结构变化
   - 智能元素定位

3. **监控系统**
   - 抓取成功率统计
   - 异常自动告警

## 9. 文件清单

```
scripts/
├── scraper/
│   ├── index.js              # 抓取主程序（本地运行）
│   ├── d1-client.js          # D1 数据库客户端
│   ├── sync-data.js          # 数据同步工具
│   ├── sync-to-d1.js         # D1 同步脚本
│   ├── install.sh            # 安装脚本
│   ├── run.sh                # 运行脚本
│   ├── setup-cron.sh         # 定时任务设置
│   └── data/
│       ├── videos.json       # 抓取的本地数据
│       ├── categories.json   # 分类数据
│       └── scraper.log       # 抓取日志
│
└── monitor.js                # Worker 监控脚本

worker/
├── src/
│   └── index.js              # Cloudflare Worker（视频代理+API）
├── schema.sql                # D1 数据库结构
└── wrangler.jsonc           # Worker 配置
```

## 10. 快速开始

```bash
# 1. 进入抓取目录
cd scripts/scraper

# 2. 安装依赖
npm install
npx playwright install chromium

# 3. 测试抓取单个视频
node index.js --mode=detail --video-id=dldss-460

# 4. 抓取整个分类
node index.js --mode=category --category=/recent/ --max-pages=5

# 5. 同步到 D1
node sync-data.js --api

# 6. 查看抓取结果
cat data/videos.json | jq '.[0]'
```

---

**文档版本**: 1.0  
**最后更新**: 2026-02-08  
**适用版本**: jable-tv-scraper v5+
