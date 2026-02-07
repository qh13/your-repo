# 视频聚合平台项目

## 项目概述

本项目是一个视频聚合网站，从 jable.tv 抓取视频信息并展示，使用 Cloudflare Worker 作为视频代理，实现低成本的视频聚合服务。

## 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│  用户浏览器                                                        │
├─────────────────────────────────────────────────────────────────┤
│  1. 访问新网站 (sexxyvideo.dpdns.org)                           │
│     └── Next.js 前端页面                                          │
│                                                                      │
│  2. 点击视频播放                                                   │
│     └── Cloudflare Worker 获取 m3u8                              │
│     └── 重写分片 URL 为 jable.tv 绝对路径                          │
│     └── 浏览器直接请求 jable.tv 视频分片                            │
│     └── Monetag 广告展示                                          │
└─────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
.
├── worker/                      # Cloudflare Worker
│   ├── src/
│   │   └── index.js            # 代理核心代码
│   ├── wrangler.toml           # 配置
│   └── package.json
├── frontend/                    # Next.js 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # 首页
│   │   │   ├── layout.tsx     # 布局
│   │   │   ├── globals.css    # 全局样式
│   │   │   └── videos/
│   │   │       └── [id]/
│   │   │           └── page.tsx  # 播放页
│   │   ├── components/
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── VideoCard.tsx
│   │   │   └── AdBanner.tsx
│   │   └── lib/
│   │       └── api.ts          # API 配置
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
├── scripts/                     # 抓取脚本
│   └── scraper/
│       └── index.js
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
# 安装 Worker 依赖
cd worker
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 部署 Cloudflare Worker

```bash
cd worker

# 登录 Cloudflare（如果需要）
npx wrangler login

# 部署 Worker
npm run deploy
```

### 3. 启动前端开发服务器

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000 查看网站。

### 4. 配置环境变量

在 `frontend` 目录下创建 `.env.local` 文件：

```env
NEXT_PUBLIC_WORKER_URL=https://your-worker-subdomain.workers.dev
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## 部署到生产环境

### 1. Cloudflare Pages

```bash
cd frontend

# 构建
npm run build

# 使用 Wrangler 部署
npx wrangler pages deploy out
```

### 2. 配置域名

在 Cloudflare 控制台中：
1. 添加自定义域名
2. 配置 DNS 记录
3. 启用 HTTPS

## Monetag 广告集成

### 注册 Monetag

1. 访问 [Monetag](https://monetag.com) 注册账号
2. 创建广告位获取广告代码
3. 将广告代码填入 `frontend/src/components/AdBanner.tsx`

### 广告位配置

| 广告位 | 格式 | 位置 |
|--------|------|------|
| top-banner | 横幅 | 首页顶部 |
| sidebar | 矩形 | 侧边栏 |
| in-feed | 水平 | 视频间 |

## 抓取系统

### 运行抓取脚本

```bash
cd scripts/scraper
npm install
node index.js
```

### 配置定时任务

使用 cron 定时执行抓取：

```bash
# 每天凌晨 2 点执行抓取
0 2 * * * /usr/bin/node /path/to/scraper/index.js >> /var/log/scraper.log 2>&1
```

## 成本估算

| 项目 | 月成本 |
|------|--------|
| Cloudflare Worker | ¥0（免费额度内）|
| Cloudflare Pages | ¥0（免费）|
| 域名托管 | ¥0（Cloudflare 免费）|
| Monetag 广告收入 | ¥500-2000（取决于流量）|

## 注意事项

1. **法律风险**：本项目仅供学习研究使用，请勿用于商业目的
2. **反爬机制**：jable.tv 可能更新反爬策略，需要相应调整抓取逻辑
3. **广告政策**：遵守 Monetag 的广告政策，避免违规操作
4. **资源使用**：合理控制抓取频率，避免对原站造成过大压力

## 许可证

MIT License