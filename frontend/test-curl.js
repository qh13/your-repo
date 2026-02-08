const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('访问演示视频...');
    await page.goto('https://f6ebd375.jable-frontend.pages.dev/videos/demo-001/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    const title = await page.$eval('h1', el => el.innerText).catch(() => '未找到标题');
    console.log('视频标题:', title);
    
    const videoSrc = await page.$eval('.player-wrapper video', el => el.src).catch(() => '无src');
    console.log('video src:', videoSrc);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
