const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 监听网络请求
  const requests = [];
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    if (url.includes('api.')) {
      requests.push({ url, status });
      console.log(`API 请求: ${url} - 状态: ${status}`);
    }
  });
  
  try {
    console.log('正在访问首页...');
    await page.goto('https://jable-frontend.pages.dev/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // 等待 API 调用
    await page.waitForTimeout(5000);
    
    // 检查所有 API 请求
    console.log('\n=== API 请求记录 ===');
    requests.forEach(r => {
      console.log(`${r.status}: ${r.url}`);
    });
    
    // 手动检查 API
    console.log('\n=== 测试 API 访问 ===');
    const apiWorks = await page.evaluate(async () => {
      try {
        const response = await fetch('https://jable-video-proxy.qh13.workers.dev/api/videos?limit=4');
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('API 测试结果:', JSON.stringify(apiWorks, null, 2));
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
