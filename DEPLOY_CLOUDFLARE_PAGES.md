# Cloudflare Pages 部署指南

本项目支持部署到 Cloudflare Pages，实现免费的前端托管。

## 架构说明

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐   │
│  │   前端静态文件   │    │   Pages Functions           │   │
│  │   (Next.js)     │    │   (可选 API 代理)            │   │
│  └─────────────────┘    └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Workers                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              jable-video-proxy                        │   │
│  │  - 视频代理 / 直播流支持                               │   │
│  │  - D1 数据库 API                                      │   │
│  │  - m3u8 重写 / Range 请求                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 部署步骤

### 方式一：通过 Cloudflare 仪表板（推荐）

#### 步骤 1：推送代码到 GitHub

```bash
# 如果还没有远程仓库，先在 GitHub 创建仓库
# 仓库名建议：otherweb2

# 添加远程仓库（如果还没添加）
git remote add origin git@github.com:qh13/otherweb2.git

# 推送代码
git push -u origin main
```

#### 步骤 2：在 Cloudflare Dashboard 中连接 GitHub 仓库

1. **打开 Cloudflare Dashboard**
   - 访问：https://dash.cloudflare.com/
   - 登录您的账户

2. **进入 Pages 设置**
   - 点击左侧菜单 **Workers & Pages**
   - 点击顶部的 **Pages** 标签
   - 点击 **Create a project**

3. **连接 GitHub 仓库**
   ```
   ┌─────────────────────────────────────────┐
   │  Create a project using Git           │
   │                                         │
   │  Connect to Git                        │
   │  ─────────────────────                  │
   │  ● GitHub                              │
   │  ○ GitLab                              │
   │  ○ Bitbucket                           │
   │                                         │
   │  [Account] [Repository]                │
   │  qh13        ▼ otherweb2               │
   │                                         │
   │  [Begin setup]                         │
   └─────────────────────────────────────────┘
   ```

4. **配置构建设置**（已修复 Root directory 问题）

   ```
   Project setup
   ─────────────────────────────────────
   
   Project name: jable-frontend
   
   Framework preset: None ▼
   
   Build command: cd frontend && npm run build
   
   Build output directory: frontend/.next
   
   Root directory: (留空)
   
   ─────────────────────────────────────
   [Deploy site]
   ```

   ⚠️ **注意**：

5. **等待构建完成**
   - 首次构建可能需要 2-5 分钟
   - 查看 **Build logs** 查看构建进度

6. **部署完成**
   ```
   Success!
   Your site is live!
   
   https://jable-frontend.pages.dev
   ```

#### 步骤 3：配置环境变量（重要！）

部署完成后，需要配置 API 地址：

1. 进入 **Pages** → **jable-frontend** → **Settings**
2. 点击 **Environment variables**
3. 添加以下变量：

| 变量名 | 值 | 类型 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://jable-video-proxy.qh13.workers.dev` | Production & Preview |

4. 点击 **Save and Deploy** 重新部署

#### 步骤 4：设置自定义域名（可选）

1. 进入 **Pages** → **jable-frontend** → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入您的域名（如 `video.yourdomain.com`）
4. 按照提示配置 DNS

### 方式二：通过 Wrangler CLI

1. **安装 Wrangler**

```bash
npm install -g wrangler
```

2. **登录 Cloudflare**

```bash
wrangler login
```

3. **部署前端**

```bash
# 在 frontend 目录执行
npx wrangler pages deploy .next/standalone --project-name=jable-frontend
```

## 环境变量配置

如果需要，在 Cloudflare Pages 中设置以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | Worker URL | 例如 `https://jable-video-proxy.yourname.workers.dev` |

设置路径：**Pages** → **您的项目** → **Settings** → **Environment variables**

## 自定义域名（可选）

1. 在 Cloudflare Dashboard 中添加自定义域名
2. 确保域名 DNS 指向 Cloudflare
3. Cloudflare 会自动配置 SSL 证书

## 注意事项

### API 路由
本项目的 `/api/*` 路由在 Cloudflare Pages 上需要特殊配置：

**选项 A：使用 Cloudflare Worker 提供 API**
- API 已经在 `worker/` 目录中配置
- 部署 Worker：`cd worker && npx wrangler deploy`
- 前端通过 `NEXT_PUBLIC_API_URL` 环境变量指向 Worker

**选项 B：静态导出模式**
如需纯静态部署（无服务器 API），需要修改 `next.config.js`：

```javascript
const nextConfig = {
  output: 'export',  // 添加这行
  // ... 其他配置
}
```

但这会导致 API 路由不可用。

## 验证部署

部署完成后，访问：

- 前端：`https://your-project.pages.dev`
- API：`https://your-project.pages.dev/api/videos`
- Worker：`https://jable-video-proxy.yourname.workers.dev/api/videos`

## 监控和维护

### 查看构建日志
在 Cloudflare Dashboard 的 **Pages** → **您的项目** → **Builds** 中查看。

### 监控
```bash
# 监控 Worker 健康状态
cd scripts
node monitor.js health
```

### 常见问题

**Q: 构建失败？**
A: 检查构建日志，确保所有依赖已正确安装。

**Q: API 返回 404？**
A: API 需要由 Worker 提供，确保 Worker 已部署并在运行。

**Q: 图片加载失败？**
A: 检查 `next.config.js` 中的 `images.remotePatterns` 配置。
