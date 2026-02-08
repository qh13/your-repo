# jable.tv 视频更新频率监控脚本使用指南

## 📋 目录
1. [功能概述](#功能概述)
2. [快速开始](#快速开始)
3. [命令详解](#命令详解)
4. [配置选项](#配置选项)
5. [使用场景示例](#使用场景示例)
6. [高级用法](#高级用法)
7. [故障排除](#故障排除)
8. [最佳实践](#最佳实践)

---

## 🎯 功能概述

这个脚本用于监控 jable.tv 网站上视频信息的更新频率，特别关注：

- 📝 **标题更新** - 检测视频标题是否发生变化
- 🖼️ **封面图片** - 追踪封面图URL的变更
- 🎬 **播放地址** - 监控 m3u8 流媒体地址的变化
- 👁️ **观看次数** - 追踪播放量统计
- 🏷️ **标签和分类** - 检测元数据变化

### 核心特性
- 🔄 **持续监控** - 支持后台持续运行，定时检查更新
- 📊 **历史记录** - 自动保存历史数据，便于分析更新频率
- 📈 **统计报告** - 生成详细的更新频率报告（JSON 和 Markdown 格式）
- 🎯 **智能检测** - 精确识别哪些字段发生了变化
- 🔁 **自动重试** - 网络请求失败时自动重试
- 🎨 **彩色日志** - 易于阅读的日志输出

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd /Users/jason/Documents/other/otherweb2/scripts/scraper
npm install playwright
```

### 2. 基本使用 - 检查单个视频
```bash
node update-monitor.js check --video-id=mmkz-161
```

### 3. 查看当前监控状态
```bash
node update-monitor.js summary
```

### 4. 生成更新频率报告
```bash
node update-monitor.js report
```

---

## 📖 命令详解

### check - 检查单个视频
检查指定视频的最新信息，并与历史记录对比。

```bash
# 基本用法
node update-monitor.js check --video-id=mmkz-161

# 输出示例
✅ 检查结果: {
  "videoId": "mmkz-161",
  "status": "updated",  // 或 "unchanged" / "error"
  "timestamp": "2026-02-08T10:53:33.457Z",
  "changes": [...],  // 变化的字段列表
  "hasStreamChange": false,
  "data": {
    "title": "视频标题",
    "coverUrl": "封面图URL",
    "streamUrl": "m3u8播放地址",
    ...
  }
}
```

### check-all - 检查所有视频
一次性检查所有添加到监控列表的视频。

```bash
node update-monitor.js check-all

# 输出示例
✅ 检查完成:
总视频数: 3
有更新: 1
无变化: 1
错误: 1
播放地址更新: 0
```

### add - 添加视频到监控列表
将视频添加到监控列表。

```bash
# 添加单个视频
node update-monitor.js add --video-id=mmkz-161

# 批量添加多个视频
node update-monitor.js add --video-ids=mmkz-161,mmkz-159,sssr-208

✅ 已添加视频: mmkz-161
✅ 已添加视频: mmkz-159, sssr-208
```

### discover - 自动发现新视频
从视频分类页面自动发现并添加新视频。

```bash
# 从最新视频页面发现（默认）
node update-monitor.js discover

# 从指定分类发现
node update-monitor.js discover --category=/recent/ --pages=5

# 从模特页面发现
node update-monitor.js discover --category=/models/ --pages=3

# 输出示例
✅ 发现完成，当前监控 15 个视频
```

### monitor - 持续监控（后台运行）
启动持续监控模式，定期检查视频更新。

```bash
# 使用默认间隔（5分钟）
node update-monitor.js monitor

# 自定义检查间隔
node update-monitor.js monitor --interval=60000   # 1分钟
node update-monitor.js monitor --interval=300000  # 5分钟
node update-monitor.js monitor --interval=3600000 # 1小时

# 输出示例
🔄 正在监控中，按 Ctrl+C 停止...
```

**注意**：使用 `monitor` 命令后，脚本会持续运行。按 `Ctrl+C` 可以安全停止。

### report - 生成更新频率报告
生成详细的更新频率分析报告。

```bash
# 为所有监控视频生成报告
node update-monitor.js report

# 为特定视频生成报告
node update-monitor.js report --video-id=mmkz-161

# 报告文件位置
data/update-monitor/reports/update-report-2026-02-08T10-54-32-077Z.json
data/update-monitor/reports/update-report-2026-02-08T10-54-32-077Z.md
```

**Markdown 报告示例**：
```markdown
# jable.tv 视频更新频率报告
生成时间: 2026-02-08T10:54:32.077Z

## 概览
- 监控视频数量: 3
- 有历史记录的视频: 2

## 视频: mmkz-161
- 链接: https://jable.tv/videos/mmkz-161/
- 最新标题: MMKZ-161 爆尻スゴい凄い！
- 最后检查: 2026-02-08T10:54:01.303Z

### 更新频率统计
- 总检查次数: 5
- 检测到更新次数: 2
- 播放地址更新次数: 1
- 平均更新间隔: 120.5 minutes
- 更新模式: active

### 字段更新统计
- title: 1 次
- streamUrl: 1 次
```

### summary - 快速摘要
显示当前监控状态的快速摘要。

```bash
node update-monitor.js summary

# 输出示例
📊 当前监控状态:
{
  "monitoredVideos": 3,
  "historySize": 2,
  "videoStatuses": [
    {
      "videoId": "mmkz-161",
      "latestTitle": "视频标题",
      "lastCheck": "2026-02-08T10:54:01.303Z",
      "totalChecks": 5,
      "updateCount": 2,
      "streamUpdates": 1,
      "status": "active"
    }
  ]
}
```

### history - 查看历史记录
查看指定视频的历史检查记录。

```bash
node update-monitor.js history --video-id=mmkz-161

# 输出示例
📜 mmkz-161 的历史记录 (5 条):
1. [2026-02-08T10:00:00.000Z] MMKZ-161 爆尻スゴい可愛い！
2. [2026-02-08T10:05:00.000Z] MMKZ-161 爆尻スゴい可愛い！
3. [2026-02-08T10:10:00.000Z] MMKZ-161 爆尻スゴい 주장했다！
...
```

---

## ⚙️ 配置选项

### 默认配置
脚本的默认配置在文件顶部的 `CONFIG` 对象中：

```javascript
const CONFIG = {
  // 默认监控的视频ID列表
  DEFAULT_VIDEO_IDS: ['mmkz-161', 'mmkz-159', 'sssr-208'],
  
  // 检查间隔（毫秒）
  CHECK_INTERVAL: 300000,  // 5分钟
  
  // 重试配置
  RETRY_TIMES: 3,          // 重试次数
  RETRY_DELAY: 3000,      // 重试间隔（毫秒）
  
  // 监控的字段列表
  MONITOR_FIELDS: [
    'title',          // 标题
    'description',    // 描述
    'coverUrl',       // 封面图
    'duration',       // 时长
    'views',          // 观看次数
    'publishDate',   // 发布日期
    'category',       // 分类
    'tags',           // 标签
    'author.name',    // 作者名
    'author.avatar',  // 作者头像
    'streamUrl',      // 播放地址
    'streamUrls',     // 所有播放源
  ],
};
```

### 修改默认配置
要修改默认配置，可以编辑脚本顶部的 `CONFIG` 对象：

```javascript
// 修改默认监控的视频
DEFAULT_VIDEO_IDS: ['video1', 'video2', 'video3'],

// 缩短检查间隔（1分钟）
CHECK_INTERVAL: 60000,

// 增加重试次数
RETRY_TIMES: 5,
```

---

## 💡 使用场景示例

### 场景1：监控特定视频的更新
```bash
# 1. 添加要监控的视频
node update-monitor.js add --video-id=mmkz-161

# 2. 进行首次检查（建立基线）
node update-monitor.js check --video-id=mmkz-161

# 3. 等待一段时间后再次检查
sleep 3600  # 等待1小时
node update-monitor.js check --video-id=mmkz-161

# 4. 查看历史变化
node update-monitor.js history --video-id=mmkz-161

# 5. 生成更新报告
node update-monitor.js report --video-id=mmkz-161
```

### 场景2：批量监控多个视频
```bash
# 1. 批量添加视频
node update-monitor.js add --video-ids=mmkz-161,mmkz-159,sssr-208,abc-123

# 2. 检查所有视频
node update-monitor.js check-all

# 3. 查看摘要
node update-monitor.js summary

# 4. 生成综合报告
node update-monitor.js report
```

### 场景3：从分类页面发现新视频并监控
```bash
# 1. 从最新视频页面发现前5页的新视频
node update-monitor.js discover --category=/recent/ --pages=5

# 2. 检查所有新发现的视频
node update-monitor.js check-all

# 3. 开始持续监控（每10分钟检查一次）
node update-monitor.js monitor --interval=600000
```

### 场景4：定期生成更新频率分析报告
```bash
# 创建定时任务，每天生成一次报告
# 在 crontab 中添加：
0 0 * * * cd /path/to/scraper && node update-monitor.js report

# 报告将保存在：
# data/update-monitor/reports/
```

### 场景5：长期监控视频更新模式
```bash
# 1. 启动持续监控（后台运行）
nohup node update-monitor.js monitor --interval=300000 > monitor.log 2>&1 &

# 2. 定期查看日志
tail -f monitor.log

# 3. 定期生成报告分析
node update-monitor.js report

# 4. 一段时间后停止监控
# 找到进程并终止
ps aux | grep update-monitor.js
kill <PID>
```

---

## 🛠️ 高级用法

### 1. 自定义监控字段
如果只想监控特定字段的变化，可以修改脚本：

```javascript
// 只监控标题和播放地址
MONITOR_FIELDS: [
  'title',
  'streamUrl',
],
```

### 2. 集成到其他脚本
可以在 Node.js 代码中导入并使用这些类：

```javascript
const { UpdateFrequencyMonitor, CONFIG } = require('./update-monitor.js');

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${msg}`),
};

const monitor = new UpdateFrequencyMonitor(CONFIG, logger);

// 添加视频
monitor.addVideo('mmkz-161');

// 检查单个视频
async function check() {
  await monitor.fetcher.init();
  const result = await monitor.checkVideo('mmkz-161');
  await monitor.fetcher.close();
  console.log(result);
}

check();
```

### 3. 数据导出和分析
从生成的历史数据可以进一步分析：

```javascript
// 读取历史数据
const history = require('./data/update-monitor/history/monitor-history.json');

// 分析更新频率
Object.entries(history).forEach(([videoId, records]) => {
  const updates = records.filter((r, i) => 
    i > 0 && JSON.stringify(r.data) !== JSON.stringify(records[i-1].data)
  );
  
  console.log(`${videoId}: ${updates.length} 次更新`);
});
```

---

## 🔧 故障排除

### 问题1：页面加载超时
**错误信息**：
```
page.goto: Timeout 30000ms exceeded
```

**解决方案**：
1. 增加超时时间
2. 使用 `domcontentloaded` 替代 `networkidle`
3. 检查网络连接

```bash
# 临时增加超时（需要修改脚本）
# 在 CONFIG 中修改 TIMEOUT 值
```

### 问题2：无法提取播放地址
**可能原因**：
1. 网站结构变化
2. 视频已被删除
3. 需要登录才能访问

**解决方案**：
1. 检查页面是否正常加载
2. 查看日志中的错误信息
3. 尝试使用 `check-all` 检查其他视频

### 问题3：脚本运行缓慢
**优化建议**：
1. 减少监控的视频数量
2. 增加检查间隔
3. 减少重试次数
4. 使用 `discover` 功能批量添加时减少页数

### 问题4：内存使用过高
**解决方案**：
1. 定期清理历史数据（删除 `data/update-monitor/history/` 中的旧文件）
2. 减少 `DEFAULT_VIDEO_IDS` 中的视频数量
3. 定期重启监控进程

### 问题5：Playwright 错误
**错误信息**：
```
Error: Browser did not launch
```

**解决方案**：
```bash
# 1. 安装 Playwright 浏览器
npx playwright install

# 2. 或者使用现有浏览器
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node update-monitor.js
```

---

## 📈 最佳实践

### 1. 合理设置检查间隔
- **活跃监控**：5-10 分钟间隔
- **常规监控**：30-60 分钟间隔
- **低频监控**：1-4 小时间隔

### 2. 定期清理历史
```bash
# 保留最近30天的数据
find data/update-monitor/history -name "*.json" -mtime +30 -delete
```

### 3. 监控策略
```javascript
// 推荐策略
const CONFIG = {
  // 1. 核心视频：短间隔
  DEFAULT_VIDEO_IDS: ['important-video-1', 'important-video-2'],
  CHECK_INTERVAL: 300000,  // 5分钟
  
  // 2. 一般视频：长间隔
  // 可通过命令行参数覆盖
};
```

### 4. 日志管理
```bash
# 定期压缩日志
gzip -k data/update-monitor/update-monitor.log

# 删除旧日志（保留30天）
find data/update-monitor -name "*.log.gz" -mtime +30 -delete
```

### 5. 监控多个账号/网站
```bash
# 为不同网站创建不同的配置副本
cp update-monitor.js update-monitor-site2.js
# 修改 CONFIG.BASE_URL 和 DEFAULT_VIDEO_IDS
node update-monitor-site2.js check --video-id=xxx
```

---

## 📊 数据文件说明

### 目录结构
```
data/update-monitor/
├── history/
│   └── monitor-history.json    # 历史记录数据库
├── reports/
│   ├── update-report-2026-02-08T10-54-32-077Z.json
│   └── update-report-2026-02-08T10-54-32-077Z.md
└── update-monitor.log          # 实时日志
```

### monitor-history.json 结构
```json
{
  "mmkz-161": [
    {
      "timestamp": "2026-02-08T10:00:00.000Z",
      "id": "mmkz-161",
      "title": "视频标题",
      "coverUrl": "https://...",
      "streamUrl": "https://...m3u8",
      "fetchedAt": "2026-02-08T10:00:00.000Z"
    },
    {
      "timestamp": "2026-02-08T10:05:00.000Z",
      "id": "mmkz-161",
      "title": "视频标题",  // 未变化
      "coverUrl": "https://...",  // 未变化
      "streamUrl": "https://...m3u8",  // 可能变化
      "fetchedAt": "2026-02-08T10:05:00.000Z"
    }
  ]
}
```

---

## 🎓 进阶技巧

### 1. 检测播放地址变化
脚本会自动检测 `streamUrl` 和 `streamUrls` 的变化：

```javascript
// 当播放地址变化时
{
  "hasStreamChange": true,
  "changes": [
    {
      "field": "streamUrl",
      "oldValue": "https://old-cdn.../video.m3u8",
      "newValue": "https://new-cdn.../video.m3u8"
    }
  ]
}
```

### 2. 计算平均更新间隔
从报告中的统计数据可以分析更新模式：

```javascript
// 假设 history 中有多个时间点
const timestamps = history.map(h => new Date(h.timestamp).getTime());
const intervals = [];
for (let i = 1; i < timestamps.length; i++) {
  intervals.push(timestamps[i] - timestamps[i-1]);
}
const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
console.log(`平均更新间隔: ${avgInterval / 1000 / 60} 分钟`);
```

### 3. 设置告警
可以结合脚本输出设置告警：

```bash
# 检查是否有播放地址更新
node update-monitor.js report --video-id=mmkz-161 | grep -q "streamUpdates: 1" && \
  echo "⚠️ 播放地址已更新！" | mail -s "Jable.tv 更新告警" admin@example.com
```

---

## 📞 获取帮助

### 查看所有命令
```bash
node update-monitor.js help
```

### 查看版本
当前版本：1.0.0（2026-02-08）

### 报告问题
如遇到问题，请提供：
1. 完整的错误日志
2. 使用的命令
3. 操作系统版本
4. Node.js 版本（`node --version`）

---

## 📝 更新日志

### v1.0.0 (2026-02-08)
- ✨ 初始版本发布
- 🎯 支持视频信息抓取
- 📊 支持更新频率监控
- 📈 支持历史记录保存
- 📋 支持报告生成
- 🔄 支持持续监控
- 🎨 支持彩色日志输出
- 🛡️ 支持错误重试机制

---

**Happy Monitoring! 🎉**
