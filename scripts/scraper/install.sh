#!/bin/bash
# jable.tv 抓取脚本安装脚本

set -e

echo "=========================================="
echo "jable.tv Scraper v5 安装脚本"
echo "=========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js (v16+)"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ npm 版本: $(npm --version)"

# 切换到抓取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "📦 安装依赖..."
npm install playwright @playwright/test fs-extra

echo ""
echo "🌐 安装 Playwright 浏览器..."
npx playwright install chromium

echo ""
echo "✅ 安装完成！"
echo ""
echo "📋 使用方法:"
echo "   1. 运行抓取: node index.js"
echo "   2. 查看数据: cat data/videos.json | head -c 5000"
echo "   3. 查看日志: cat data/scraper.log"
echo ""
echo "⏰ 定时任务 (每天凌晨 2 点运行):"
echo "   0 2 * * * cd $(pwd) && node index.js >> /var/log/jable-scraper.log 2>&1"
echo ""
echo "=========================================="