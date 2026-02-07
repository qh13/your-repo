# 测试用例使用说明

## 📁 测试目录结构

```
frontend/tests/
├── api/                      # API 接口测试
│   └── worker-api.spec.ts    # Cloudflare Worker API 测试
├── components/                # 组件测试
│   ├── frontend-components.spec.ts  # 前端组件测试
│   └── video-player.spec.ts        # 视频播放器测试
├── pages/                    # 页面测试
│   └── frontend-pages.spec.ts      # 前端页面测试
└── utils/                   # 测试工具
    ├── env.ts              # 环境变量配置
    └── mockData.ts         # Mock 数据工厂
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 安装 Playwright 浏览器

```bash
# 安装所有浏览器
npx playwright install

# 或者只安装 Chromium（推荐用于调试）
npx playwright install chromium

# 安装系统依赖
npx playwright install --with-deps chromium
```

### 3. 配置环境变量

创建 `.env.test` 文件：

```bash
# 前端 URL
FRONTEND_URL=http://localhost:3000

# Worker API URL（可选，用于实际 API 测试）
WORKER_URL=https://jable-video-proxy.qh13.workers.dev
```

### 4. 运行测试

```bash
# 运行所有测试
npm run test

# 运行并打开 UI 界面
npm run test:ui

# 只运行 API 测试
npm run test:api

# 只运行页面测试
npm run test:pages

# 只运行组件测试
npm run test:components

# 只运行视频播放器测试
npm run test:video

# 查看测试报告
npm run test:report
```

## 📝 测试类型说明

### API 测试 (`tests/api/worker-api.spec.ts`)

测试 Cloudflare Worker 提供的 API 端点：

- ✅ `/api/videos` - 视频列表 API
- ✅ `/api/videos/:id` - 视频详情 API
- ✅ `/api/search` - 搜索 API
- ✅ `/api/hot` - 热门视频 API
- ✅ `/api/categories` - 分类 API
- ✅ `/api/stats` - 统计 API
- ✅ M3U8 代理测试
- ✅ 视频分片代理测试
- ✅ CORS 配置测试

### 页面测试 (`tests/pages/frontend-pages.spec.ts`)

测试前端页面的功能：

- ✅ 首页 - 视频网格、统计、分类导航
- ✅ 视频详情页 - 播放器、元信息
- ✅ 搜索页面 - 搜索功能、结果展示
- ✅ 分类页面 - 分类视频列表
- ✅ 热门页面 - 热门视频排行
- ✅ 404 页面 - 错误处理
- ✅ 响应式设计 - 多设备适配

### 组件测试 (`tests/components/`)

测试前端 React 组件：

- ✅ `VideoCard` - 视频卡片
- ✅ `VideoGrid` - 视频网格
- ✅ `VideoPlayer` - 视频播放器
- ✅ `SearchForm` - 搜索表单
- ✅ `StatsDisplay` - 统计显示
- ✅ `AdBanner` - 广告组件
- ✅ 分类导航组件
- ✅ 侧边栏组件

### 视频播放测试 (`tests/components/video-player.spec.ts`)

专门测试视频播放功能：

- ✅ 播放器基础功能
- ✅ HLS.js 集成
- ✅ 视频质量切换
- ✅ 视频代理功能
- ✅ 跨域播放 (CORS)
- ✅ 播放性能测试

## 🔧 编写新测试

### 添加 API 测试

```typescript
import { test, expect } from '@playwright/test';

test.describe('新的 API 测试', () => {
  test('应该返回正确的响应', async ({ request }) => {
    const response = await request.get('/api/your-endpoint');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

### 添加页面测试

```typescript
import { test, expect } from '@playwright/test';

test.describe('新页面测试', () => {
  test('页面应该正确加载', async ({ page }) => {
    await page.goto('/your-page');
    
    await expect(page.locator('.page-selector')).toBeVisible({
      timeout: 10000
    });
  });
});
```

### 添加 Mock 数据

在 `tests/utils/mockData.ts` 中添加：

```typescript
export const mockYourData = {
  id: 'your-id',
  name: 'Your Name',
  // ... 其他字段
};
```

## 🎯 运行模式说明

### 本地开发模式

```bash
# 1. 启动前端开发服务器
npm run dev

# 2. 另开终端运行测试
npm run test
```

### CI/CD 模式

```bash
# 预设 CI 环境变量
export FRONTEND_URL=http://localhost:3000
export WORKER_URL=https://your-worker.workers.dev

# 运行测试
npm run test
```

## 📊 测试覆盖率

测试用例覆盖以下关键功能：

1. **API 功能**
   - CRUD 操作
   - 分页和筛选
   - 搜索功能
   - 错误处理

2. **页面功能**
   - 页面渲染
   - 用户交互
   - 导航跳转
   - 响应式布局

3. **视频播放**
   - HLS 流播放
   - 跨域代理
   - 播放控制
   - 性能监控

## 🐛 常见问题

### 1. 测试超时

 увеличить 超时时间：

```typescript
test('长时间操作测试', async ({ page }) => {
  // ...
}, 60000); // 60 秒超时
```

### 2. 网络不稳定

使用重试机制：

```bash
npm run test -- --retries=2
```

### 3. 浏览器启动失败

重新安装浏览器：

```bash
npx playwright install --with-deps chromium
```

### 4. Mock 数据不匹配

检查 Mock 数据格式是否与 API 响应一致：

```typescript
// 确保字段名和类型匹配
interface YourApiResponse {
  success: boolean;
  data: YourDataType;
}
```

## 📈 性能基准

- 页面加载时间：< 5秒
- API 响应时间：< 2秒
- 测试执行时间：< 30秒（全套）
- 浏览器启动时间：< 10秒

## 🔒 安全注意

- 不要在测试中暴露敏感信息
- 使用环境变量存储 API 密钥
- 定期清理测试数据
- 使用专用测试数据库

## 📚 相关文档

- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [Next.js 测试指南](https://nextjs.org/docs/testing)
- [Cloudflare Worker 测试最佳实践](https://developers.cloudflare.com/workers/testing/)

## ✅ 测试检查清单

在提交代码前，确保：

- [ ] 所有测试通过
- [ ] 新功能有对应测试
- [ ] 修复的 Bug 有回归测试
- [ ] 测试数据合理
- [ ] Mock 数据准确
- [ ] 没有控制台错误
- [ ] 响应式布局正常
- [ ] 跨浏览器兼容
