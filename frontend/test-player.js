const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`CONSOLE: ${msg.text()}`);
    }
  });
  
  try {
    console.log('访问视频详情页...');
    await page.goto('https://production.jable-frontend.pages.dev/videos/dldss-460/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    const playerWrapper = await page.$('.player-wrapper');
    console.log('播放器容器:', playerWrapper ? '存在' : '不存在');
    
    const videoElement = await page.$('.player-wrapper video');
    console.log('video 元素:', videoElement ? '存在' : '不存在');
    
    const videoSrc = await page.$eval('.player-wrapper video', el => el.src).catch(() => '无src');
    console.log('video src:', videoSrc);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
