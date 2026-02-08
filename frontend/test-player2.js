const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('访问测试视频...');
    await page.goto('https://production.jable-frontend.pages.dev/videos/test-001/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    const playerWrapper = await page.$('.player-wrapper');
    console.log('播放器容器:', playerWrapper ? '存在' : '不存在');
    
    const videoElement = await page.$('.player-wrapper video');
    console.log('video 元素:', videoElement ? '存在' : '不存在');
    
    const videoSrc = await page.$eval('.player-wrapper video', el => el.src).catch(() => '无src');
    console.log('video src:', videoSrc);
    
    // 检查是否有播放错误
    const errorText = await page.$eval('.player-wrapper', el => el.innerText).catch(() => '无错误');
    console.log('播放器内容:', errorText.substring(0, 100));
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
