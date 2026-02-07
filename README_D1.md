# 视频聚合平台 - 完整技术文档

## 项目概述

本项目是一个完整的视频聚合平台解决方案，包含：
- **Cloudflare Worker** - 视频代理 + D1 数据库 API
- **Next.js 前端** - 响应式用户界面
- **Playwright 抓取系统** - 自动从 jable.tv 抓取视频元数据
- **Cloudflare D1** - 无服务器 SQL 数据库

## 技术架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐     ┌─────────────┐
│   用户浏览器  │ ──> │  Next.js     │ ──> │ Cloudflare Worker       │ ──> │  jable.tv   │
│              │     │  前端托管     │     │ (代理 + D1 API + 缓存)  │     │   原始站     │
└─────────────┘     └──────────────┘     └─────────────────────────┘     └─────────────┘
                            │                       │
                            │                       ▼
                            │              ┌─────────────────────────┐
                            └────────────▶ │ Cloudflare D1 数据库   │
                                           │ (视频元数据存储)        │
                                           └─────────────────────────┘
```

## 目录结构

```
otherweb2/
├── worker/                    # Cloudflare Worker
│   ├── src/index.js          # Worker 主代码（代理 + API）
│   ├── wrangler.jsonc        # Worker 配置
│   ├── schema.sql            # D1 数据库 schema
│   └── package.json
│
├── frontend/                 # Next.js 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # 首页
│   │   │   ├── layout.tsx         # 布局
│   │   │   ├── search/            # 搜索页面
│   │   │   ├── category/          # 分类页面
│   │   │   ├── hot/               # 热门页面
│   │   │   ├── videos/            # 视频详情
│   │   │   └── about/            # 关于页面
│   │   ├── components/
│   │   │   ├── VideoGrid.tsx      # 视频列表组件
│   │   │   ├── VideoPlayer.tsx    # 视频播放器
│   │   │   ├── StatsDisplay.tsx   # 统计显示
│   │   │   └── SearchForm.tsx    # 搜索表单
│   │   └── lib/
│   │       ├── api.ts             # API 配置
│   │       └── video-data.ts      # 数据获取
│   └── package.json
│
├── scripts/
│   ├── scraper/
│   │   ├── index.js         # 抓取主程序
│   │   ├── d1-client.js    # D1 数据库客户端
│   │   └── ...
│   └── monitor.js           # Worker 监控脚本
│
└── README_D1.md            # 本文档
```

## 快速开始

### 1. 创建 D1 数据库

```bash
cd worker

# 创建数据库
npx wrangler d1 create jable-videos

# 更新配置文件（将 database_id 填入 wrangler.jsonc）

# 执行 schema
npx wrangler d1 execute jable-videos --file=schema.sql --remote
```

### 2. 部署 Worker

```bash
cd worker

# 开发测试
npx wrangler dev

# 部署到生产环境
npx wrangler deploy
```

### 3. 运行前端

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

### 4. 运行抓取脚本

```bash
cd scripts/scraper

# 安装 Playwright
npm install
npx playwright install chromium

# 测试单个视频
node index.js --mode=detail --video-id=dldss-460

# 抓取分类
node index.js --mode=category --category=/recent/ --max-pages=3

# 增量更新
node index.js --mode=incremental
```

## API 文档

### 视频列表
```
GET /api/videos?page=1&limit=20&category=all&search=关键词
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "dldss-460",
        "title": "视频标题",
        "description": "视频描述",
        "duration": "12:34",
        "views": "1.2M",
        "coverUrl": "https://...",
        "category": "models",
        "categoryName": "模特",
        "authorName": "作者名",
        "tags": ["标签1", "标签2"],
        "scrapedAt": "2024-01-15T12:00:00.000Z",
        "viewCount": 1234
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 视频详情
```
GET /api/videos/{videoId}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "dldss-460",
    "title": "视频标题",
    "streamUrl": "https://jable-video-proxy.qh13.workers.dev/dldss-460.m3u8",
    "streamQualities": {
      "240p": "...",
      "480p": "..."
    },
    ...
  }
}
```

### 搜索视频
```
GET /api/search?q=关键词&limit=20
```

### 热门视频
```
GET /api/hot?limit=10
```

### 分类列表
```
GET /api/categories
```

### 统计信息
```
GET /api/stats
```

### 保存视频（管理员）
```
POST /api/admin/save-video
Content-Type: application/json

{
  "id": "dldss-460",
  "title": "视频标题",
  "coverUrl": "https://...",
  "category": "models",
  ...
}
```

## 缓存策略

| 资源类型 | 缓存时间 | 说明 |
|---------|---------|------|
| m3u8 列表 | 3 秒 | 短期缓存，允许快速更新 |
| .ts 分片 | 1 年 | 长期缓存，减少回源 |
| API 响应 | 60 秒 | 中等缓存，平衡性能 |

## 成本估算

| 服务 | 免费额度 | 超出费用 | 本项目预估 |
|------|---------|----------|----------|
| Cloudflare Worker | 100万请求/天 | $5/百万请求 | 免费 |
| Cloudflare D1 | 5GB 存储 | $0.015/GB/月 | 免费（<5GB） |
| Cloudflare Pages | 500MB 带宽/月 | $0.02/GB | $0-5/月 |
| 视频流量 | 用户直接访问 | 免费 | 免费 |

**月成本：$0-5**（取决于流量）

## 功能列表

### 已完成 ✅

- [x] Cloudflare Worker 视频代理
- [x] m3u8 播放列表 URL 重写
- [x] Range 请求支持（视频拖拽）
- [x] Cloudflare D1 数据库集成
- [x] 完整 CRUD API
- [x] 搜索功能
- [x] 分页功能
- [x] 分类功能
- [x] 热门视频
- [x] 统计功能
- [x] 分层缓存策略
- [x] 透明代理（内容来源透明）
- [x] Playwright 抓取脚本
- [x] 增量更新
- [x] 响应式前端
- [x] Worker 监控脚本

### 待开发 ⏳

- [ ] 定时抓取（Cloudflare Workers Cron）
- [ ] 用户系统
- [ ] 评论功能
- [ ] 收藏功能
- [ ] 历史记录

## 监控和维护

### 查看 Worker 日志

```bash
npx wrangler tail
```

### 监控 Worker

```bash
node scripts/monitor.js health    # 健康检查
node scripts/monitor.js test      # 功能测试
node scripts/monitor.js metrics   # 性能指标
node scripts/monitor.js monitor   # 持续监控
```

### D1 数据库操作

```bash
# 查看数据库信息
npx wrangler d1 info jable-videos

# 执行 SQL 查询
npx wrangler d1 execute jable-videos --remote --command="SELECT COUNT(*) FROM videos"

# 导出数据
npx wrangler d1 execute jable-videos --remote --command=".dump" > backup.sql
```

## 常见问题

### Q: 视频无法播放？
A: 
1. 检查 Worker 日志：`npx wrangler tail`
2. 确认 m3u8 URL 是否正确重写
3. 检查浏览器控制台错误信息

### Q: D1 查询超时？
A: D1 有查询限制（单次查询最多 100ms CPU 时间）
- 避免复杂的 JOIN 操作
- 使用索引优化查询
- 考虑使用 Cloudflare KV 缓存热点数据

### Q: 抓取脚本被封 IP？
A: 
- 降低抓取频率
- 使用代理池（如果有）
- 分散抓取时间

### Q: 如何添加新分类？
A: 
1. 在 D1 数据库中插入分类：`INSERT INTO categories (slug, name, ...) VALUES (...)`
2. 更新前端分类列表

### Q: 广告不显示？
A: 
1. 注册广告平台账户（Monetag、AdSense 等）
2. 获取广告代码
3. 更新 `AdBanner.tsx` 组件

## 最佳实践

1. **使用透明代理**：明确标注内容来源，提高广告平台审核通过率
2. **合理设置缓存**：减少回源次数，降低成本
3. **增量更新**：定期更新视频元数据，避免重复抓取
4. **监控告警**：设置监控告警，及时发现问题
5. **定期备份**：定期导出数据库备份

## 法律声明

⚠️ **重要提示**

1. 本项目仅供学习和研究使用
2. 抓取第三方网站内容可能涉及版权问题
3. 使用本项目产生的一切法律问题由使用者自行承担
4. 请确保您有权访问和展示相关内容

## 许可证

MIT License
