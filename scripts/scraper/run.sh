#!/bin/bash
# 运行抓取脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 启动 jable.tv 抓取脚本..."
echo "⏰ 开始时间: $(date)"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，安装依赖..."
    npm install
fi

# 运行抓取
node index.js

echo ""
echo "⏰ 结束时间: $(date)"
echo "✅ 抓取完成！"
echo ""
echo "📊 查看数据: cat data/videos.json | jq 'length' "
echo "📋 查看日志: tail -50 data/scraper.log"