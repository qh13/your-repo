#!/bin/bash
#
# 设置定时任务脚本
#
# 功能：
# 1. 设置自动抓取定时任务
# 2. 设置自动同步定时任务
# 3. 设置监控定时任务
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "   Jable.tv 定时任务设置"
echo "=========================================="
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  警告: 当前不是 root 用户，可能需要 sudo 权限"
    SUDO="sudo"
else
    SUDO=""
fi

# 获取当前 cron 配置
echo "📋 当前定时任务配置:"
crontab -l 2>/dev/null || echo "  (无定时任务)"
echo ""

# 添加定时任务选项
add_cron_job() {
    local schedule="$1"
    local command="$2"
    local description="$3"
    
    # 检查是否已存在
    if crontab -l 2>/dev/null | grep -qF "$command"; then
        echo "✅ $description - 已存在"
    else
        # 添加新任务
        (crontab -l 2>/dev/null; echo "$schedule $command") | crontab -
        echo "✅ $description - 已添加"
    fi
}

echo "🔧 添加定时任务..."
echo ""

# 1. 每天凌晨 2 点全量抓取
add_cron_job \
    "0 2 * * *" \
    "cd $SCRIPT_DIR && ./full-scrape.sh 5 >> /var/log/jable-scraper.log 2>&1" \
    "每日全量抓取 (凌晨 2:00)"

# 2. 每 6 小时增量更新
add_cron_job \
    "0 */6 * * *" \
    "cd $SCRIPT_DIR && node index-enhanced.js --mode=incremental >> /var/log/jable-incremental.log 2>&1" \
    "增量更新 (每 6 小时)"

# 3. 每天凌晨 3 点同步到 D1
add_cron_job \
    "0 3 * * *" \
    "cd $SCRIPT_DIR && node sync-data.js --api >> /var/log/jable-sync.log 2>&1" \
    "D1 数据同步 (凌晨 3:00)"

# 4. 每小时健康检查
add_cron_job \
    "0 * * * *" \
    "cd $SCRIPT_DIR && node ../monitor.js health >> /var/log/jable-monitor.log 2>&1" \
    "Worker 健康检查 (每小时)"

# 5. 每周日清理旧日志
add_cron_job \
    "0 4 * * 0" \
    "find /var/log -name 'jable-*.log' -mtime +7 -delete" \
    "清理旧日志 (每周日凌晨)"

echo ""
echo "=========================================="
echo "   定时任务更新完成"
echo "=========================================="
echo ""
echo "📋 当前定时任务:"
crontab -l
echo ""
echo "📝 说明:"
echo "   - 定时任务日志保存在 /var/log/jable-*.log"
echo "   - 如需修改定时任务，请编辑 crontab: crontab -e"
echo "   - 查看日志: tail -f /var/log/jable-scraper.log"
echo ""
