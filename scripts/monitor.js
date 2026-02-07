/**
 * Worker 监控脚本
 * 用于监控 Worker 运行状态和性能指标
 */

const WORKER_URL = process.env.WORKER_URL || 'https://jable-video-proxy.qh13.workers.dev';

/**
 * 检查 Worker 健康状态
 */
async function checkHealth() {
  try {
    const response = await fetch(`${WORKER_URL}/api/stats`);
    const data = await response.json();
    
    console.log('\n✅ Worker 健康检查通过');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('\n❌ Worker 健康检查失败:', error.message);
    return null;
  }
}

/**
 * 测试视频代理功能
 */
async function testProxy() {
  console.log('\n🧪 测试视频代理功能...');
  
  const testCases = [
    { name: 'm3u8 代理', url: `${WORKER_URL}/test-video.m3u8`, expectSuccess: false },
    { name: 'API 统计', url: `${WORKER_URL}/api/stats`, expectSuccess: true },
    { name: 'API 视频列表', url: `${WORKER_URL}/api/videos?page=1&limit=5`, expectSuccess: true },
  ];
  
  for (const test of testCases) {
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });
      
      const success = response.ok === test.expectSuccess;
      console.log(`${success ? '✅' : '⚠️'} ${test.name}: ${response.status} ${response.statusText}`);
      
      if (!success) {
        console.log(`   预期: ${test.expectSuccess ? '成功' : '失败'}, 实际: ${response.ok ? '成功' : '失败'}`);
      }
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}`);
    }
  }
}

/**
 * 测试缓存功能
 */
async function testCache() {
  console.log('\n🧪 测试缓存功能...');
  
  // 第一次请求
  const start1 = Date.now();
  const response1 = await fetch(`${WORKER_URL}/api/stats`);
  const duration1 = Date.now() - start1;
  
  // 第二次请求（应该命中缓存）
  const start2 = Date.now();
  const response2 = await fetch(`${WORKER_URL}/api/stats`);
  const duration2 = Date.now() - start2;
  
  const cacheStatus1 = response1.headers.get('X-Cache-Status');
  const cacheStatus2 = response2.headers.get('X-Cache-Status');
  
  console.log(`✅ 第一次请求: ${duration1}ms, Cache: ${cacheStatus1 || 'N/A'}`);
  console.log(`✅ 第二次请求: ${duration2}ms, Cache: ${cacheStatus2 || 'N/A'}`);
  
  if (duration2 < duration1 * 0.5) {
    console.log('✅ 缓存似乎正常工作（第二次请求更快）');
  }
}

/**
 * 获取 Worker 性能指标
 */
async function getMetrics() {
  console.log('\n📊 获取性能指标...');
  
  try {
    const [statsRes, videosRes] = await Promise.all([
      fetch(`${WORKER_URL}/api/stats`),
      fetch(`${WORKER_URL}/api/videos?limit=1`),
    ]);
    
    const stats = await statsRes.json();
    const videos = await videosRes.json();
    
    console.log('\n📈 Worker 性能指标:');
    console.log(JSON.stringify({
      总视频数: stats.data?.totalVideos || 0,
      总观看次数: stats.data?.totalViews || 0,
      分类数: stats.data?.totalCategories || 0,
      API响应: videos.success ? '正常' : '异常',
    }, null, 2));
    
    return { stats, videos };
  } catch (error) {
    console.error('❌ 获取性能指标失败:', error.message);
    return null;
  }
}

/**
 * 监控循环
 */
async function monitor(interval = 60000) {
  console.log(`\n🔄 开始监控 Worker (间隔: ${interval / 1000}秒)`);
  
  const monitorLog = [];
  
  const runMonitor = async () => {
    const result = await checkHealth();
    
    if (result) {
      monitorLog.push({
        timestamp: new Date().toISOString(),
        status: 'healthy',
        data: result,
      });
    } else {
      monitorLog.push({
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: 'Health check failed',
      });
    }
    
    // 保留最近 100 条记录
    if (monitorLog.length > 100) {
      monitorLog.shift();
    }
  };
  
  // 立即执行一次
  await runMonitor();
  
  // 设置定时监控
  const timer = setInterval(runMonitor, interval);
  
  // 处理退出信号
  process.on('SIGINT', async () => {
    console.log('\n🛑 停止监控...');
    clearInterval(timer);
    
    console.log(`\n📋 监控记录 (共 ${monitorLog.length} 条):`);
    monitorLog.forEach((log, i) => {
      console.log(`${i + 1}. [${log.timestamp}] ${log.status}`);
    });
    
    process.exit(0);
  });
}

/**
 * 压力测试
 */
async function stressTest(requests = 100, concurrency = 10) {
  console.log(`\n🚀 开始压力测试 (${requests} 请求, 并发 ${concurrency})`);
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  const latencies = [];
  
  const runRequest = async () => {
    const start = Date.now();
    try {
      const response = await fetch(`${WORKER_URL}/api/stats`);
      if (response.ok) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      failCount++;
    }
    latencies.push(Date.now() - start);
  };
  
  // 分批执行
  const batches = [];
  for (let i = 0; i < requests; i += concurrency) {
    const batch = [];
    for (let j = 0; j < concurrency && i + j < requests; j++) {
      batch.push(runRequest());
    }
    batches.push(Promise.all(batch));
  }
  
  await Promise.all(batches);
  
  const totalTime = Date.now() - startTime;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  
  console.log('\n📊 压力测试结果:');
  console.log(`总请求数: ${requests}`);
  console.log(`成功: ${successCount}, 失败: ${failCount}`);
  console.log(`成功率: ${((successCount / requests) * 100).toFixed(2)}%`);
  console.log(`总耗时: ${totalTime}ms`);
  console.log(`平均延迟: ${avgLatency.toFixed(2)}ms`);
  console.log(`最小延迟: ${minLatency}ms`);
  console.log(`最大延迟: ${maxLatency}ms`);
  console.log(`每秒请求数 (RPS): ${(requests / (totalTime / 1000)).toFixed(2)}`);
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'health':
      await checkHealth();
      break;
      
    case 'test':
      await checkHealth();
      await testProxy();
      break;
      
    case 'cache':
      await checkHealth();
      await testCache();
      break;
      
    case 'metrics':
      await getMetrics();
      break;
      
    case 'monitor':
      const interval = parseInt(args[1]?.split('=')[1] || '60000');
      await monitor(interval);
      break;
      
    case 'stress':
      const requests = parseInt(args[1]?.split('=')[1] || '100');
      const concurrency = parseInt(args[2]?.split('=')[1] || '10');
      await stressTest(requests, concurrency);
      break;
      
    case 'full':
      await checkHealth();
      await testProxy();
      await testCache();
      await getMetrics();
      break;
      
    case 'help':
    default:
      console.log(`
Worker Monitor

Usage:
  node monitor.js <command> [options]

Commands:
  health    - Check worker health status
  test      - Test proxy functionality
  cache     - Test caching functionality
  metrics   - Get performance metrics
  monitor   - Start continuous monitoring (Ctrl+C to stop)
  stress    - Run stress test
  full      - Run all tests
  help      - Show this help message

Options:
  --interval=<ms>  Monitoring interval (default: 60000)
  --requests=<n>   Number of requests for stress test (default: 100)
  --concurrency=<n>  Concurrent requests (default: 10)

Examples:
  node monitor.js health
  node monitor.js test
  node monitor.js monitor --interval=30000
  node monitor.js stress --requests=200 --concurrency=20
  node monitor.js full
`);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkHealth,
  testProxy,
  testCache,
  getMetrics,
  monitor,
  stressTest,
};
