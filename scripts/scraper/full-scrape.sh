#!/bin/bash
#
# 全量抓取脚本 - 自动执行完整抓取流程
#
# 功能：
# 1. 更新所有分类的视频
# 2. 增量更新旧视频
# 3. 同步数据到 D1
# 4. 生成抓取报告
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "   Jable.tv 全量抓取脚本"
echo "   $(date)"
echo "=========================================="
echo ""

# 配置
MAX_PAGES=${1:-10}  # 默认抓取10页，可通过参数指定
REPORT_FILE="./data/scrape-report-$(date +%Y%m%d-%H%M%S).json"

# 记录开始时间
START_TIME=$(date +%s)

# 统计
STATS={
  "startTime": "$(date -Iseconds)",
  "maxPages": $MAX_PAGES,
  "categories": [],
  "totalVideosFound": 0,
  "totalVideosNew": 0,
  "totalErrors": 0,
  "duration": 0
}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
log_info "检查依赖..."
if [ ! -d "node_modules" ]; then
    log_warn "node_modules 不存在，安装依赖..."
    npm install
fi

# 清理旧数据（可选）
# rm -f ./data/videos.json ./data/categories.json

# 1. 抓取所有分类
log_info "开始全量抓取..."
echo ""

for category in "/recent/" "/top/" "/models/"; do
    CATEGORY_START=$(date +%s)
    CATEGORY_NAME=$(basename "$category" | tr -d '/' | tr '[:lower:]' '[:upper:]')
    
    echo ""
    log_info "=== 抓取分类: $CATEGORY_NAME ==="
    
    # 抓取分类
    if node index-enhanced.js --mode=category --category="$category" --max-pages=$MAX_PAGES 2>&1; then
        CATEGORY_STATUS="success"
    else
        CATEGORY_STATUS="error"
        STATS["totalErrors"]=$((${STATS["totalErrors"]} + 1))
    fi
    
    CATEGORY_END=$(date +%s)
    CATEGORY_DURATION=$((CATEGORY_END - CATEGORY_START))
    
    # 统计该分类的视频数量
    if [ -f "./data/videos.json" ]; then
        VIDEO_COUNT=$(cat ./data/videos.json | jq 'length')
    else
        VIDEO_COUNT=0
    fi
    
    STATS["categories"]+=({
        "name": "$CATEGORY_NAME",
        "path": "$category",
        "status": "$CATEGORY_STATUS",
        "durationSeconds": $CATEGORY_DURATION,
        "videoCount": $VIDEO_COUNT
    })
    
    log_info "分类 $CATEGORY_NAME 完成，耗时 ${CATEGORY_DURATION}秒"
    
    # 避免请求过快
    sleep 2
done

# 2. 增量更新
log_info ""
log_info "执行增量更新..."
echo ""

INCREMENTAL_START=$(date +%s)

if node index-enhanced.js --mode=incremental 2>&1; then
    log_info "增量更新完成"
else
    log_warn "增量更新遇到一些问题"
    STATS["totalErrors"]=$((${STATS["totalErrors"]} + 1))
fi

INCREMENTAL_END=$(date +%s)
INCREMENTAL_DURATION=$((INCREMENTAL_END - INCREMENTAL_START))

# 3. 统计最终结果
log_info ""
log_info "统计抓取结果..."

TOTAL_VIDEOS=0
TOTAL_WITH_TITLE=0
TOTAL_WITH_DESC=0
TOTAL_WITH_DURATION=0
TOTAL_WITH_TAGS=0
TOTAL_WITH_STREAM=0

if [ -f "./data/videos.json" ]; then
    TOTAL_VIDEOS=$(cat ./data/videos.json | jq 'length')
    TOTAL_WITH_TITLE=$(cat ./data/videos.json | jq '[.[] | select(.title != "")] | length')
    TOTAL_WITH_DESC=$(cat ./data/videos.json | jq '[.[] | select(.description != "")] | length')
    TOTAL_WITH_DURATION=$(cat ./data/videos.json | jq '[.[] | select(.duration != "")] | length')
    TOTAL_WITH_TAGS=$(cat ./data/videos.json | jq '[.[] | select(.tags != null and (.tags | length) > 0)] | length')
    TOTAL_WITH_STREAM=$(cat ./data/videos.json | jq '[.[] | select(.streamUrls != null and .streamUrls.primary != null)] | length')
fi

# 4. 同步到 D1
log_info ""
log_info "同步数据到 D1..."
echo ""

if node sync-data.js --api 2>&1; then
    log_info "D1 同步完成"
else
    log_warn "D1 同步遇到一些问题"
fi

# 5. 生成报告
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

STATS={
  "startTime": "$(date -Iseconds -d @$START_TIME)",
  "endTime": "$(date -Iseconds -d @$END_TIME)",
  "durationSeconds": $DURATION,
  "maxPages": $MAX_PAGES,
  "results": {
    "totalVideos": $TOTAL_VIDEOS,
    "withTitle": $TOTAL_WITH_TITLE,
    "withDescription": $TOTAL_WITH_DESC,
    "withDuration": $TOTAL_WITH_DURATION,
    "withTags": $TOTAL_WITH_TAGS,
    "withStream": $TOTAL_WITH_STREAM
  },
  "dataQuality": {
    "titleRate": $(echo "scale=2; $TOTAL_WITH_TITLE * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0"),
    "descriptionRate": $(echo "scale=2; $TOTAL_WITH_DESC * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0"),
    "durationRate": $(echo "scale=2; $TOTAL_WITH_DURATION * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0"),
    "tagsRate": $(echo "scale=2; $TOTAL_WITH_TAGS * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0"),
    "streamRate": $(echo "scale=2; $TOTAL_WITH_STREAM * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0")
  },
  "errors": ${STATS["totalErrors"]},
  "incrementalDurationSeconds": $INCREMENTAL_DURATION
}

echo "$STATS" > "$REPORT_FILE"

# 6. 输出总结
echo ""
echo "=========================================="
echo "   抓取完成 - 总结报告"
echo "=========================================="
echo ""
echo "⏱️  总耗时: ${DURATION}秒"
echo "📊  总视频数: $TOTAL_VIDEOS"
echo ""
echo "📈 数据完整度:"
echo "   标题完整度: ${TOTAL_WITH_TITLE}/${TOTAL_VIDEOS} ($(echo "scale=1; $TOTAL_WITH_TITLE * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0")%)"
echo "   描述完整度: ${TOTAL_WITH_DESC}/${TOTAL_VIDEOS} ($(echo "scale=1; $TOTAL_WITH_DESC * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0")%)"
echo "   时长完整度: ${TOTAL_WITH_DURATION}/${TOTAL_VIDEOS} ($(echo "scale=1; $TOTAL_WITH_DURATION * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0")%)"
echo "   标签完整度: ${TOTAL_WITH_TAGS}/${TOTAL_VIDEOS} ($(echo "scale=1; $TOTAL_WITH_TAGS * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0")%)"
echo "   视频流完整度: ${TOTAL_WITH_STREAM}/${TOTAL_VIDEOS} ($(echo "scale=1; $TOTAL_WITH_STREAM * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0")%)"
echo ""
echo "📁 数据文件: ./data/videos.json"
echo "📋 报告文件: $REPORT_FILE"
echo "📋 日志文件: ./data/scraper.log"
echo ""
echo "=========================================="

# 如果数据质量太低，发出警告
TITLE_RATE=$(echo "scale=2; $TOTAL_WITH_TITLE * 100 / $TOTAL_VIDEOS" 2>/dev/null || echo "0")
if [ "$(echo "$TITLE_RATE < 50" | bc)" -eq 1 ]; then
    log_warn "⚠️  警告: 标题完整度低于 50%，可能需要更新 CSS 选择器"
    log_warn "运行 'DEBUG=1 node index-enhanced.js --mode=debug --video-id=<video-id>' 调试"
fi

exit 0
