# Jable.tv 抓取系统 - 快速参考

## 📁 文件结构

```
scripts/scraper/
├── index.js              # 原版抓取脚本
├── index-enhanced.js     # 增强版抓取脚本 (推荐使用)
├── full-scrape.sh        # 全量抓取自动化脚本
├── sync-data.js          # 数据同步工具
├── install.sh            # 安装脚本
├── setup-cron.sh        # 定时任务设置
├── SCRAPER_DOCUMENTATION.md  # 完整文档
└── data/
    ├── videos.json       # 抓取的本地数据
    ├── categories.json   # 分类数据
    ├── scraper.log       # 抓取日志
    └── debug-*.html      # 调试时保存的页面HTML
```

## 🚀 快速开始

```bash
cd scripts/scraper

# 1. 安装依赖
npm install
npx playwright install chromium

# 2. 测试单个视频抓取
node index-enhanced.js --mode=detail --video-id=dldss-460

# 3. 抓取整个分类
node index-enhanced.js --mode=category --category=/recent/ --max-pages=5

# 4. 全量抓取
./full-scrape.sh 10

# 5. 同步到 D1
node sync-data.js --api
```

## 📋 常用命令

### 抓取模式

| 命令 | 说明 |
|------|------|
| `DEBUG=1 node index-enhanced.js --mode=debug --video-id=xxx` | 调试模式（输出页面结构） |
| `node index-enhanced.js --mode=detail --video-id=xxx` | 抓取单个视频详情 |
| `node index-enhanced.js --mode=list --category=/recent/` | 抓取视频列表 |
| `node index-enhanced.js --mode=category --category=/recent/ --max-pages=5` | 抓取分类 |
| `node index-enhanced.js --mode=full --max-pages=3` | 全量抓取 |
| `node index-enhanced.js --mode=incremental` | 增量更新 |

### 同步模式

| 命令 | 说明 |
|------|------|
| `node sync-data.js` | 自动选择同步方式 |
| `node sync-data.js --api` | 通过 Worker API 同步 |
| `node sync-data.js --sql` | 通过 wrangler SQL 同步 |

### 定时任务

| 命令 | 说明 |
|------|------|
| `./setup-cron.sh` | 设置定时任务 |
| `crontab -l` | 查看定时任务 |
| `crontab -e` | 编辑定时任务 |

## 🔍 调试和排错

### 数据不完整？

```bash
# 1. 查看抓取日志
tail -100 data/scraper.log

# 2. 检查数据完整性
cat data/videos.json | jq '[.[] | {id: .id, title: .title != "", desc: .description != "", duration: .duration != ""}]'

# 3. 调试页面结构
DEBUG=1 node index-enhanced.js --mode=debug --video-id=dldss-460
# 查看生成的 debug-dldss-460.html 文件
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 标题/描述抓不到 | 运行调试模式，更新 CSS 选择器 |
| 被封 IP | 添加延时，降低抓取频率 |
| 同步失败 | 检查 Worker API 连通性 |
| 视频无法播放 | 检查 m3u8 URL 提取 |

## 📊 数据质量检查

```bash
# 检查抓取数据质量
cat data/videos.json | jq '
{
  total: length,
  withTitle: [.[] | select(.title != "")] | length,
  withDesc: [.[] | select(.description != "")] | length,
  withDuration: [.[] | select(.duration != "")] | length,
  withTags: [.[] | select(.tags != null and (.tags | length) > 0)] | length,
  withStream: [.[] | select(.streamUrls.primary != null)] | length
}'
```

## 📈 监控和维护

```bash
# Worker 监控
node ../monitor.js health          # 健康检查
node ../monitor.js test            # 功能测试
node ../monitor.js metrics         # 性能指标

# 查看日志
tail -f data/scraper.log
tail -f /var/log/jable-scraper.log
```

## ⏰ 定时任务说明

| 时间 | 任务 | 说明 |
|------|------|------|
| 凌晨 2:00 | 全量抓取 | 抓取所有分类 |
| 每 6 小时 | 增量更新 | 更新旧视频 |
| 凌晨 3:00 | D1 同步 | 同步到数据库 |
| 每小时 | 健康检查 | 监控 Worker |

---

**最后更新**: 2026-02-08
