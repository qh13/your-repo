#!/bin/bash
#===============================================================================
# jable.tv 视频更新监控 - 快速参考脚本
# 
# 使用方法: ./quick-monitor.sh <command>
# 
# 作者: AI Assistant
# 日期: 2026-02-08
#===============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     jable.tv 视频更新监控 - 快速参考脚本                   ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "使用方法: $0 <command> [options]"
    echo ""
    echo "📋 可用命令:"
    echo ""
    echo "  🎯  监控命令"
    echo "  ─────────────────────────────────────────────────────────"
    echo "  check <video-id>     检查单个视频更新"
    echo "  check-all            检查所有监控的视频"
    echo "  monitor [interval]   持续监控 (默认5分钟间隔)"
    echo ""
    echo "  📊 查看命令"
    echo "  ─────────────────────────────────────────────────────────"
    echo "  summary              显示监控摘要"
    echo "  history <video-id>  查看视频历史记录"
    echo "  report [video-id]   生成更新报告"
    echo ""
    echo "  ➕ 管理命令"
    echo "  ─────────────────────────────────────────────────────────"
    echo "  add <video-id>       添加视频到监控列表"
    echo "  add-ids <ids>        批量添加视频 (逗号分隔)"
    echo "  discover [pages]     从分类页面发现新视频"
    echo ""
    echo "  ❓ 帮助命令"
    echo "  ─────────────────────────────────────────────────────────"
    echo "  help                显示此帮助信息"
    echo "  test                运行功能测试"
    echo ""
    echo "💡 使用示例:"
    echo ""
    echo "  $0 check mmkz-161"
    echo "  $0 add mmkz-161"
    echo "  $0 add-ids mmkz-161,mmkz-159"
    echo "  $0 discover 5"
    echo "  $0 monitor 300000"
    echo "  $0 report"
    echo "  $0 summary"
    echo ""
}

# 检查单个视频
check_video() {
    if [ -z "$1" ]; then
        print_error "请指定视频ID"
        echo "用法: $0 check <video-id>"
        echo "示例: $0 check mmkz-161"
        exit 1
    fi
    print_info "检查视频: $1"
    node update-monitor.js check --video-id=$1
}

# 检查所有视频
check_all() {
    print_info "检查所有监控的视频..."
    node update-monitor.js check-all
}

# 持续监控
start_monitor() {
    local interval=${1:-300000}
    print_info "启动持续监控 (间隔: $interval ms)"
    node update-monitor.js monitor --interval=$interval
}

# 显示摘要
show_summary() {
    print_info "显示监控摘要..."
    node update-monitor.js summary
}

# 查看历史
show_history() {
    if [ -z "$1" ]; then
        print_error "请指定视频ID"
        echo "用法: $0 history <video-id>"
        echo "示例: $0 history mmkz-161"
        exit 1
    fi
    print_info "查看 $1 的历史记录..."
    node update-monitor.js history --video-id=$1
}

# 生成报告
generate_report() {
    if [ -z "$1" ]; then
        print_info "为所有视频生成报告..."
        node update-monitor.js report
    else
        print_info "为 $1 生成报告..."
        node update-monitor.js report --video-id=$1
    fi
}

# 添加视频
add_video() {
    if [ -z "$1" ]; then
        print_error "请指定视频ID"
        echo "用法: $0 add <video-id>"
        echo "示例: $0 add mmkz-161"
        exit 1
    fi
    print_success "添加视频: $1"
    node update-monitor.js add --video-id=$1
}

# 批量添加视频
add_videos() {
    if [ -z "$1" ]; then
        print_error "请指定视频ID列表"
        echo "用法: $0 add-ids <id1,id2,id3,...>"
        echo "示例: $0 add-ids mmkz-161,mmkz-159,sssr-208"
        exit 1
    fi
    print_success "批量添加视频: $1"
    node update-monitor.js add --video-ids=$1
}

# 发现新视频
discover_videos() {
    local pages=${1:-3}
    print_info "从分类页面发现新视频 (前 $pages 页)..."
    node update-monitor.js discover --pages=$pages
}

# 运行测试
run_test() {
    echo ""
    print_info "运行功能测试..."
    echo ""
    
    echo "1. 检查脚本版本..."
    echo "   脚本位置: $SCRIPT_DIR/update-monitor.js"
    echo ""
    
    echo "2. 检查依赖..."
    if [ -f "package.json" ]; then
        print_success "package.json 存在"
    else
        print_warning "package.json 不存在，需要安装依赖"
    fi
    echo ""
    
    echo "3. 检查数据目录..."
    if [ -d "data/update-monitor" ]; then
        print_success "数据目录存在"
        ls -lh data/update-monitor/ 2>/dev/null | head -5
    else
        print_warning "数据目录不存在"
    fi
    echo ""
    
    echo "4. 测试配置加载..."
    node -e "const CONFIG = require('./update-monitor.js').CONFIG; console.log('✅ 默认监控视频:', CONFIG.DEFAULT_VIDEO_IDS.length, '个'); console.log('✅ 检查间隔:', CONFIG.CHECK_INTERVAL/1000, '秒'); console.log('✅ 重试次数:', CONFIG.RETRY_TIMES);" 2>/dev/null || print_warning "配置加载测试失败"
    echo ""
    
    echo "5. 运行快速检查..."
    node update-monitor.js check --video-id=mmkz-161 2>&1 | grep -E "(✅|❌|status|title)" | head -5
    echo ""
    
    print_success "测试完成!"
}

# 主程序
case "$1" in
    check)
        check_video "$2"
        ;;
    check-all)
        check_all
        ;;
    monitor)
        start_monitor "$2"
        ;;
    summary)
        show_summary
        ;;
    history)
        show_history "$2"
        ;;
    report)
        generate_report "$2"
        ;;
    add)
        add_video "$2"
        ;;
    add-ids)
        add_videos "$2"
        ;;
    discover)
        discover_videos "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    test)
        run_test
        ;;
    *)
        echo ""
        print_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
