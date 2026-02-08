# jable.tv 视频更新频率监控项目总结

## 🎯 项目概述

本项目为 jable.tv 网站提供视频信息更新频率监控解决方案，能够追踪视频的标题、封面图片、播放地址等关键信息的变化。

---

## 📁 项目结构

```
scripts/scraper/
├── update-monitor.js              # 核心监控脚本 (1000+ 行)
├── quick-monitor.sh               # 快速参考 Bash 脚本
├── UPDATE_MONITOR_README.md       # 详细使用文档
├── UPDATE_MONITOR_SUMMARY.md      # 本文档
├── index.js                       # 原有抓取脚本
└── data/update-monitor/           # 监控数据目录
    ├── history/
    │   └── monitor-history.json   # 历史记录数据库
    ├── reports/
    │   ├── update-report-*.json  # JSON 格式报告
    │   └── update-report-*.md     # Markdown 格式报告
    └── update-monitor.log        # 实时日志
```

---

## ✨ 核心功能

### 1. 🎯 智能监控
- **自动检测变化**：精确识别标题、封面、播放地址等字段的变化
- **播放地址追踪**：专门监控 m3u8 流媒体地址的变更
- **多字段监控**：支持监控 12+ 个不同的元数据字段

### 2. 📊 数据持久化
- **历史记录**：自动保存每次检查的数据
- **增量更新**：只记录变化的数据，节省存储空间
- **可追溯性**：支持查看任意时间点的视频状态

### 3. 📈 统计报告
- **自动分析**：计算更新频率、平均更新间隔
- **可视化报告**：生成 JSON 和 Markdown 两种格式
- **字段统计**：显示每个字段的更新次数

### 4. 🔄 持续监控
- **后台运行**：支持长期持续监控
- **灵活间隔**：可自定义检查间隔（秒/分钟/小时）
- **自动重试**：网络错误时自动重试

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Playwright
- 稳定的网络连接

### 安装依赖
```bash
cd /Users/jason/Documents/other/otherweb2/scripts/scraper
npm install playwright
npx playwright install
```

### 最简单的使用方式

```bash
# 方式1: 使用快速脚本
./quick-monitor.sh check mmkz-161
./quick-monitor.sh summary
./quick-monitor.sh report

# 方式2: 直接使用 Node.js 脚本
node update-monitor.js check --video-id=mmkz-161
```

---

## 📖 使用示例

### 示例1: 一次性检查
```bash
# 检查单个视频
./quick-monitor.sh check mmkz-161

# 输出示例
✅ 检查结果: {
  "videoId": "mmkz-161",
  "status": "updated",
  "changes": [...],
  "data": {
    "title": "MMKZ-161 爆尻スゴい可愛い！",
    "coverUrl": "https://assets-cdn.jable.tv/...",
    "streamUrl": "https://...m3u8"
  }
}
```

### 示例2: 批量监控
```bash
# 添加多个视频
./quick-monitor.sh add-ids mmkz-161,mmkz-159,sssr-208

# 检查所有视频
./quick-monitor.sh check-all

# 查看摘要
./quick-monitor.sh summary
```

### 示例3: 持续监控
```bash
# 启动持续监控（5分钟间隔）
./quick-monitor.sh monitor

# 或自定义间隔（1分钟）
./quick-monitor.sh monitor 60000

# 查看日志
tail -f data/update-monitor/update-monitor.log

# 按 Ctrl+C 停止
```

### 示例4: 自动发现新视频
```bash
# 从最新视频页面发现前5页
./quick-monitor.sh discover 5

# 从指定分类发现
./quick-monitor.sh discover 3
```

### 示例5: 生成分析报告
```bash
# 生成所有视频的报告
./quick-monitor.sh report

# 生成特定视频的报告
./quick-monitor.sh report mmkz-161

# 查看报告
cat data/update-monitor/reports/update-report-*.md
```

---

## 🎨 监控指标说明

### 状态类型
- ✅ **updated**: 检测到变化
- ℹ️ **unchanged**: 无变化
- ❌ **error**: 获取失败

### 监控字段
| 字段 | 说明 | 重要性 |
|------|------|--------|
| `title` | 视频标题 | 高 |
| `coverUrl` | 封面图片 URL | 高 |
| `streamUrl` | m3u8 播放地址 | ⭐ 极高 |
| `description` | 视频描述 | 中 |
| `duration` | 时长 | 低 |
| `views` | 观看次数 | 中 |
| `tags` | 标签列表 | 中 |
| `category` | 分类 | 低 |

### 输出指标
- `totalChecks`: 总检查次数
- `updateCount`: 检测到更新的次数
- `streamUpdates`: 播放地址更新次数
- `averageUpdateInterval`: 平均更新间隔
- `updatePattern`: 更新模式（active/stable）

---

## 💡 高级用法

### 1. 定时任务配置
```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点生成报告
0 2 * * * cd /Users/jason/Documents/other/otherweb2/scripts/scraper && ./quick-monitor.sh report

# 每小时检查一次所有视频
0 * * * * cd /Users/jason/Documents/other/otherweb2/scripts/scraper && ./quick-monitor.sh check-all
```

### 2. 监控特定字段变化
编辑 `update-monitor.js` 中的 `MONITOR_FIELDS`：

```javascript
// 只监控标题和播放地址
MONITOR_FIELDS: [
  'title',
  'streamUrl',
],
```

### 3. 集成到监控系统
```javascript
const { UpdateFrequencyMonitor } = require('./update-monitor.js');

// 自定义监控逻辑
const monitor = new UpdateFrequencyMonitor(CONFIG, customLogger);

// 检查并发送告警
async function checkWithAlert() {
  const result = await monitor.checkVideo('mmkz-161');
  if (result.hasStreamChange) {
    sendAlert(`播放地址已更新: ${result.videoId}`);
  }
}
```

### 4. 数据导出与分析
```bash
# 导出历史数据
node -e "
const data = require('./data/update-monitor/history/monitor-history.json');
console.log(JSON.stringify(data, null, 2));
" > history-export.json

# 使用 Python 分析
python3 << 'EOF'
import json
with open('history-export.json') as f:
    data = json.load(f)
    
for video_id, history in data.items():
    updates = len(history)
    print(f'{video_id}: {updates} 次检查')
EOF
```

---

## 📊 实际测试结果

### 测试环境
- **操作系统**: macOS
- **Node.js**: v22.14.0
- **Playwright**: Chromium

### 测试视频
- `mmkz-161`: MMKZ-161 爆尻スゴい可愛い！
- `mmkz-159`: MMKZ-159 お姉さんの巨尻...
- `sssr-208`: 待检测

### 测试结果
```
✅ 成功获取视频信息
✅ 正确提取 m3u8 播放地址
✅ 历史记录保存正常
✅ 报告生成成功
✅ 持续监控功能正常
```

### 提取的数据示例
```json
{
  "id": "mmkz-161",
  "title": "MMKZ-161 爆尻スゴい可愛い！",
  "coverUrl": "https://assets-cdn.jable.tv/contents/videos_screenshots/56000/56731/preview.jpg",
  "streamUrl": "https://edge-hls.saawsedge.com/hls/213719841/master/213719841_240p.m3u8",
  "tags": ["黑絲", "過膝襪", "運動裝", ...],
  "fetchedAt": "2026-02-08T10:57:25.162Z"
}
```

---

## 🔧 故障排除

### 常见问题

#### 1. 页面加载超时
```bash
# 症状
Error: page.goto: Timeout 30000ms exceeded

# 解决方案
# 编辑 update-monitor.js，增加超时时间
# 或使用较短的网络idle等待
```

#### 2. Playwright 浏览器未安装
```bash
# 解决方案
npx playwright install chromium
```

#### 3. 权限错误
```bash
# 症状
Error: EACCES: permission denied

# 解决方案
chmod +x quick-monitor.sh
```

#### 4. 内存不足
```bash
# 症状
Process out of memory

# 解决方案
# 1. 减少监控的视频数量
# 2. 增加检查间隔
# 3. 清理历史数据
rm -rf data/update-monitor/history/*
```

---

## 📈 性能优化建议

### 1. 调整检查间隔
```javascript
// 活跃监控
CHECK_INTERVAL: 300000,  // 5分钟

// 常规监控
CHECK_INTERVAL: 900000,  // 15分钟

// 低频监控
CHECK_INTERVAL: 3600000, // 1小时
```

### 2. 限制历史记录数量
```javascript
// 在 MonitorStorage 类中
const MAX_HISTORY = 100;  // 每视频最多保留100条
```

### 3. 定期清理
```bash
# 创建清理脚本
cat > cleanup.sh << 'EOF'
#!/bin/bash
# 保留最近7天的历史
find data/update-monitor/history -name "*.json" -mtime +7 -delete
# 保留最近30天的报告
find data/update-monitor/reports -name "*.json" -mtime +30 -delete
find data/update-monitor/reports -name "*.md" -mtime +30 -delete
# 压缩日志
gzip -k data/update-monitor/update-monitor.log
# 删除旧日志（保留30天）
find data/update-monitor -name "*.log.gz" -mtime +30 -delete
EOF

chmod +x cleanup.sh
```

---

## 🎓 最佳实践

### 1. 合理的监控策略
```javascript
// 推荐：分层监控
CONST CONFIG = {
  // 核心视频：短间隔、高优先级
  DEFAULT_VIDEO_IDS: ['important-1', 'important-2'],
  CHECK_INTERVAL: 300000,  // 5分钟
  
  // 一般视频：长间隔
  // 可在命令行覆盖
};
```

### 2. 定期检查日志
```bash
# 每天检查错误日志
tail -100 data/update-monitor/update-monitor.log | grep ERROR

# 监控脚本运行状态
ps aux | grep update-monitor
```

### 3. 数据备份
```bash
# 定期备份监控数据
tar -czvf backup-$(date +%Y%m%d).tar.gz data/update-monitor/

# 恢复到指定备份
tar -xzvf backup-20260208.tar.gz
```

---

## 📚 相关文档

1. **详细使用文档**: `UPDATE_MONITOR_README.md`
2. **快速参考**: `./quick-monitor.sh help`
3. **源代码**: `update-monitor.js`

---

## 🚀 未来扩展方向

### 计划功能
- [ ] 📧 邮件告警通知
- [ ] 💬 Slack/Discord 集成
- [ ] 📱 Telegram 机器人
- [ ] 🌐 Web 仪表板
- [ ] 📊 数据可视化
- [ ] 🔔 播放地址变更实时通知
- [ ] 📈 更新趋势预测
- [ ] 📉 异常检测

### 技术扩展
- [ ] 替换 Playwright 为轻量级 HTTP 客户端
- [ ] 添加数据库支持（SQLite/PostgreSQL）
- [ ] 支持多网站监控
- [ ] 添加 REST API 接口
- [ ] Docker 容器化部署

---

## 📞 技术支持

### 获取帮助
```bash
# 查看帮助
./quick-monitor.sh help

# 运行测试
./quick-monitor.sh test

# 查看日志
tail -f data/update-monitor/update-monitor.log
```

### 报告问题
请提供以下信息：
1. 完整的错误日志
2. 使用的命令
3. 操作系统版本
4. Node.js 版本 (`node --version`)
5. Playwright 版本

---

## 📝 更新日志

### v1.0.0 (2026-02-08)
- ✨ 初始版本发布
- 🎯 完整视频信息抓取功能
- 📊 智能变化检测
- 🔄 持续监控支持
- 📈 详细统计报告
- 🎨 彩色日志输出
- 🛡️ 自动重试机制
- 📖 完整文档

---

## ✅ 总结

本项目成功实现了 jable.tv 视频信息更新频率监控的核心功能，包括：

1. ✅ **视频信息抓取** - 标题、封面、播放地址等
2. ✅ **变化检测** - 精确识别哪些字段发生变化
3. ✅ **历史记录** - 保存完整的监控历史
4. ✅ **统计分析** - 生成详细的更新频率报告
5. ✅ **持续监控** - 支持后台长期运行
6. ✅ **易于使用** - 多种使用方式（命令行/API）

**项目状态**: ✅ 生产就绪

**使用难度**: ⭐ 简单

**适用场景**: 
- 视频更新追踪
- 播放地址监控
- 内容变化分析
- 自动化运维

---

**文档版本**: 1.0.0  
**最后更新**: 2026-02-08  
**作者**: AI Assistant

---

## 🎯 下一步行动

1. **立即体验**: `./quick-monitor.sh test`
2. **查看文档**: `cat UPDATE_MONITOR_README.md`
3. **开始监控**: `./quick-monitor.sh add <video-id>`
4. **生成报告**: `./quick-monitor.sh report`

Happy Monitoring! 🎉
