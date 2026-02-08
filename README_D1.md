# 视频聚合平台 - 完整技术文档

## 项目概述

本项目是一个完整的视频聚合平台解决方案，包含：
- **Cloudflare Worker** - 视频代理 + D1 数据库 API + KV 缓存
- **Next.js 前端** - 响应式用户界面 + Pages Functions SSR
- **Playwright 抓取系统** - 自动从 jable.tv 抓取视频元数据
- **Cloudflare D1** - 无服务器 SQL 数据库
- **Cloudflare KV** - 热点数据高速缓存

## 技术架构

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Cloudflare 全球网络                                      │
│                                                                                 │
│  ┌──────────────────────────┐         ┌──────────────────────────┐            │
│  │    Cloudflare Pages      │         │    Cloudflare Workers    │            │
│  │  ┌────────────────────┐  │         │  ┌────────────────────┐  │            │
│  │  │   SSR 渲染         │  │         │  │   /api/*          │  │            │
│  │  │   • 首页           │  │         │  │   • CRUD API       │  │            │
│  │  │   • 搜索页         │  │         │  │   • 搜索          │  │            │
│  │  │   • 视频详情页     │  │         │  │   • 统计          │  │            │
│  │  └────────────────────┘  │         │  └────────────────────┘  │            │
│  │                          │         │                          │            │
│  │  ┌────────────────────┐  │         │  ┌────────────────────┐  │            │
│  │  │   静态资源         │  │         │  │   视频代理         │  │            │
│  │  │   • CSS/JS/图片   │  │         │  │  • m3u8 代理       │  │            │
│  │  └────────────────────┘  │         │  │  • .ts 代理        │  │            │
│  └──────────────────────────┘         │  │  • Range 请求      │  │            │
│                                        │  └────────────────────┘  │            │
│                                        │                          │            │
│                                        │         ┌────────────┐   │            │
│                                        │         │   KV       │   │            │
│                                        │         │   Cache    │   │            │
│                                        │         └─────┬──────┘   │            │
│                                        │               │ 热点缓存 │            │
│                                        │               ▼          │            │
│                                        │  ┌────────────────────┐  │            │
│                                        │  │   D1 数据库        │  │            │
│                                        │  │   • videos 表      │  │            │
│                                        │  │   • categories 表 │  │            │
│                                        │  │   • scrape_logs  │  │            │
│                                        │  └────────────────────┘  │            │
│                                        └──────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
                            │
                            │ 代理请求
                            ▼
                   ┌────────────────┐
                   │   jable.tv     │
                   │   原始视频网站  │
                   └────────────────┘
```

## 目录结构

```
otherweb2/
├── worker/                    # Cloudflare Worker
│   ├── src/index.js          # Worker 主代码（代理 + API + KV 缓存）
│   ├── wrangler.jsonc        # Worker 配置（包含 D1 + KV + Cron）
│   ├── schema.sql            # D1 数据库 schema
│   └── package.json
│
├── frontend/                 # Next.js 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # 首页（CSR 备用）
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
│   │
│   ├── functions/            # Pages Functions (SSR)
│   │   ├── index.js           # 首页 SSR
│   │   ├── search.js          # 搜索页 SSR
│   │   └── videos/
│   │       └── [id].js       # 视频详情页 SSR
│   │
│   ├── wrangler.toml         # Pages 配置
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

## 渲染模式

| 页面 | 渲染模式 | 说明 |
|-----|---------|------|
| 首页 `/` | SSR (Pages Functions) | 服务端渲染，SEO 友好，首屏快速 |
| 视频详情页 `/videos/{id}` | SSR (Pages Functions) | 服务端渲染，嵌入播放器 |
| 搜索页 `/search` | SSR (Pages Functions) | 服务端渲染，实时搜索 |
| 分类页 `/category/*` | CSR (Next.js) | 客户端渲染，可改 SSR |

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

### 2. 创建 KV 命名空间（新增）

```bash
cd worker

# 创建 KV 命名空间
npx wrangler kv namespace create "VIDEO_CACHE"

# 更新 wrangler.jsonc（自动完成）
```

### 3. 部署 Worker

```bash
cd worker

# 开发测试
npx wrangler dev

# 部署到生产环境
npx wrangler deploy
```

### 4. 部署前端

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy .next/server/app --project-name=jable-frontend
```

### 5. 运行抓取脚本

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

### 视频详情
```
GET /api/videos/{videoId}
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

### KV 缓存预热
```
POST /api/admin/warmup
```

## 缓存策略

| 资源类型 | 存储位置 | 缓存时间 | 说明 |
|---------|---------|---------|------|
| 热点视频元数据 | Cloudflare KV | 1 小时 | 快速查询热门视频 |
| m3u8 列表 | Cache API | 3 秒 | 短期缓存，允许快速更新 |
| .ts 分片 | Cache API | 1 年 | 长期缓存，减少回源 |
| API 响应 | Cache API | 60 秒 | 中等缓存，平衡性能 |
| SSR 页面 | CDN | 60 秒 | 首页/搜索页缓存 |

## Workers Cron 定时任务

在 `wrangler.jsonc` 中配置：

```json
{
  "triggers": {
    "crons": [
      "0 * * * *",        // 每小时执行（增量更新）
      "0 4 * * *",        // 每天凌晨4点（完整抓取 + KV 预热）
      "0 6 * * 0"         // 每周日凌晨6点（大型更新）
    ]
  }
}
```

### 手动触发缓存预热

```bash
# 通过 API
curl -X POST https://jable-video-proxy.qh13.workers.dev/api/admin/warmup

# 通过 Cron
npx wrangler deploy --triggers
```

## 成本估算

| 服务 | 免费额度 | 超出费用 | 本项目预估 |
|------|---------|----------|----------|
| Cloudflare Worker | 100万请求/天 | $5/百万请求 | 免费 |
| Cloudflare D1 | 5GB 存储 | $0.015/GB/月 | 免费（<5GB） |
| Cloudflare KV | 10GB 读/写/月 | $0.01/百万读 | 免费（<10GB） |
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
- [x] Cloudflare KV 缓存
- [x] Workers Cron 定时任务
- [x] 首页 SSR 渲染
- [x] 搜索页 SSR 渲染
- [x] 视频详情页 SSR 渲染

### 待开发 ⏳

- [ ] 定时抓取（Cloudflare Workers Cron）
- [ ] 用户系统
- [ ] 评论功能
- [ ] 收藏功能
- [ ] 历史记录
- [ ] Cloudflare Images 图片优化

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

### KV 缓存操作

```bash
# 查看 KV 命名空间
npx wrangler kv namespace list

# 手动设置值（测试用）
npx wrangler kv key put --binding=VIDEO_CACHE "video:test" '{"title":"测试"}'

# 查看值
npx wrangler kv key list --binding=VIDEO_CACHE
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
- 使用 KV 缓存热点数据

### Q: 抓取脚本被封 IP？
A: 
- 降低抓取频率
- 使用代理池（如果有）
- 分散抓取时间

### Q: KV 缓存未命中？
A:
- 确认 KV 绑定正确（`env.VIDEO_CACHE`）
- 确认已执行缓存预热
- 检查 Worker 日志中的 `[KV HIT/MISS]` 标记

### Q: SSR 页面未生效？
A:
- 确认 `functions/` 目录下的函数已部署
- 检查 `wrangler.toml` 中的路由配置
- 清除浏览器缓存

## 最佳实践

1. **使用 KV 缓存**：热点视频数据存储在 KV 中，提升查询速度
2. **合理设置缓存**：减少回源次数，降低成本
3. **增量更新**：定期更新视频元数据，避免重复抓取
4. **监控告警**：设置监控告警，及时发现问题
5. **定期备份**：定期导出数据库备份
6. **SSR 首屏**：首页和视频详情页使用 SSR，提升 SEO 和首屏速度

## 法律声明

⚠️ **重要提示**

1. 本项目仅供学习和研究使用
2. 抓取第三方网站内容可能涉及版权问题
3. 使用本项目产生的一切法律问题由使用者自行承担
4. 请确保您有权访问和展示相关内容

## 许可证

MIT License
