const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 监听所有控制台消息
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`CONSOLE ERROR: ${msg.text()}`);
    }
  });
  
  // 监听页面错误
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });
  
  try {
    console.log('正在访问首页...');
    await page.goto('https://jable-frontend.pages.dev/', { waitUntil: 'load', timeout: 30000 });
    
    // 等待 JavaScript 执行
    await page.waitForTimeout(8000);
    
    // 检查 DOM
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('页面内容:', bodyHtml);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
