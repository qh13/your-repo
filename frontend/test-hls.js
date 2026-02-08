const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('=== 验证 HLS 视频播放 ===\n');
    
    await page.goto('https://production.jable-frontend.pages.dev/videos/ipzz-777/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    
    const title = await page.$eval('h1', el => el.innerText).catch(() => '未找到');
    console.log('视频标题:', title);
    
    const videoSrc = await page.$eval('.player-wrapper video', el => el.src).catch(() => '无');
    console.log('Stream URL:', videoSrc);
    
    const readyState = await page.$eval('.player-wrapper video', el => el.readyState).catch(() => -1);
    console.log('加载状态:', readyState === 4 ? '已就绪' : `状态${readyState}`);
    
    const duration = await page.$eval('.player-wrapper video', el => el.duration > 0 ? `${el.duration.toFixed(0)}秒` : '未知').catch(() => '未知');
    console.log('视频时长:', duration);
    
    // 检查播放器是否有错误
    const error = await page.$eval('.player-wrapper', el => el.innerText.includes('错误') ? '有错误' : '无错误').catch(() => '未知');
    console.log('播放器状态:', error);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
  console.log('\n✅ 验证完成');
})();
