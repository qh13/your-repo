const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('访问视频详情页...');
    await page.goto('https://44421345.jable-frontend.pages.dev/videos/test-001/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 检查页面内容
    const title = await page.$eval('h1', el => el.innerText).catch(() => '未找到标题');
    console.log('视频标题:', title);
    
    // 检查播放器和视频信息
    const info = await page.$eval('.video-detail-info', el => el.innerText.substring(0, 200)).catch(() => '未找到信息');
    console.log('视频信息:', info.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
