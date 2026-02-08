const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('访问演示视频...');
    await page.goto('https://f6ebd375.jable-frontend.pages.dev/videos/demo-001/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    
    const title = await page.$eval('h1', el => el.innerText).catch(() => '未找到标题');
    console.log('视频标题:', title);
    
    const videoSrc = await page.$eval('.player-wrapper video', el => el.src).catch(() => '无src');
    console.log('video src:', videoSrc);
    
    const readyState = await page.$eval('.player-wrapper video', el => el.readyState).catch(() => -1);
    console.log('readyState:', readyState);
    
    const duration = await page.$eval('.player-wrapper video', el => el.duration > 0 ? `${el.duration.toFixed(2)}秒` : '未知').catch(() => '未知');
    console.log('视频时长:', duration);
    
    const buffered = await page.$eval('.player-wrapper video', el => el.buffered.length > 0 ? `${(el.buffered.end(0) - el.buffered.start(0)).toFixed(2)}秒` : '无').catch(() => '未知');
    console.log('缓冲:', buffered);
    
    // 检查 HLS 是否加载（检查 video 的错误）
    const error = await page.$eval('.player-wrapper video', el => el.error ? el.error.message : '无').catch(() => '未知');
    console.log('错误:', error);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
  console.log('\n✅ 测试完成');
})();
