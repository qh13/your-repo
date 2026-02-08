#!/bin/bash
# 部署脚本 - 将 Next.js 构建与 Cloudflare Pages Functions 一起部署

set -e

echo "🚀 开始部署到 Cloudflare Pages..."

# 进入前端目录
cd "$(dirname "$0")"

# 1. 构建 Next.js
echo "📦 构建 Next.js..."
npm run build

# 2. 准备部署目录
echo "📁 准备部署文件..."
BUILD_DIR=".next/server/app"
TEMP_DEPLOY_DIR="_deploy_temp"

# 创建临时部署目录
rm -rf "$TEMP_DEPLOY_DIR"
mkdir -p "$TEMP_DEPLOY_DIR"

# 复制构建输出
cp -r "$BUILD_DIR"/* "$TEMP_DEPLOY_DIR"/

# 复制 functions 目录到根目录
rm -rf "$TEMP_DEPLOY_DIR/functions"
cp -r "functions" "$TEMP_DEPLOY_DIR/"

# 3. 部署到 Cloudflare Pages
echo "☁️ 部署到 Cloudflare Pages..."
npx wrangler pages deploy "$TEMP_DEPLOY_DIR" --project-name=jable-frontend --branch=main

# 清理临时目录
rm -rf "$TEMP_DEPLOY_DIR"

echo ""
echo "✅ 部署完成!"
echo ""
echo "📝 下次部署时，只需运行:"
echo "   cd frontend && bash deploy.sh"
