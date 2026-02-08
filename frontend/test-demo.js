const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('访问演示视频...');
    await page.goto('https://production.jable-frontend.pages.dev/videos/demo-001/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    const title = await page.$eval('h1', el => el.innerText).catch(() => '未找到标题');
    console.log('视频标题:', title);
    
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
