const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('访问原始视频 dldss-460...');
    await page.goto('https://f6ebd375.jable-frontend.pages.dev/videos/dldss-460/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    const title = await page.$eval('h1', el => el.innerText).catch(() => '未找到');
    console.log('标题:', title.substring(0, 50));
    
    const videoSrc = await page.$eval('.player-wrapper video', el => el.src).catch(() => '无');
    console.log('video src:', videoSrc);
    
    const error = await page.$eval('.player-wrapper video', el => el.error ? el.error.message : '无').catch(() => '未知');
    console.log('播放器错误:', error);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
