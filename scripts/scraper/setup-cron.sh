#!/bin/bash
# 定时任务安装脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "设置 jable.tv 抓取定时任务"
echo "=========================================="
echo ""
echo "将创建 crontab 任务："
echo "  - 每天凌晨 2 点自动运行抓取"
echo "  - 日志保存到 /var/log/jable-scraper.log"
echo ""
echo "确认安装? (y/n)"
read -r confirm

if [ "$confirm" != "y" ]; then
    echo "已取消"
    exit 0
fi

# 创建日志文件
sudo touch /var/log/jable-scraper.log
sudo chmod 666 /var/log/jable-scraper.log

# 获取当前用户名
USER=$(whoami)

# 添加定时任务
CRON_JOB="0 2 * * * cd $SCRIPT_DIR && node index.js >> /var/log/jable-scraper.log 2>&1"

# 检查是否已有任务
if crontab -l 2>/dev/null | grep -q "jable-scraper"; then
    echo "⚠️  定时任务已存在，先移除..."
    crontab -l | grep -v "jable-scraper" | crontab -
fi

# 添加新任务
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ 定时任务已安装！"
echo ""
echo "📋 管理命令:"
echo "  - 查看任务: crontab -l"
echo "  - 编辑任务: crontab -e"
echo "  - 删除任务: crontab -l | grep -v 'jable-scraper' | crontab -"
echo ""
echo "📊 日志位置: /var/log/jable-scraper.log"
echo ""
echo "=========================================="