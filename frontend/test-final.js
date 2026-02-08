const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`ERROR: ${msg.text()}`);
    }
  });
  
  try {
    console.log('访问演示视频...');
    await page.goto('https://production.jable-frontend.pages.dev/videos/demo-001/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    const title = await page.$eval('h1', el => el.innerText).catch(() => '未找到标题');
    console.log('视频标题:', title);
    
    const videoSrc = await page.$eval('.player-wrapper video', el => el.src).catch(() => '无src');
    console.log('video src:', videoSrc);
    
    // 检查是否已加载 HLS
    const readyState = await page.$eval('.player-wrapper video', el => el.readyState).catch(() => -1);
    console.log('readyState:', readyState);
    
    const buffered = await page.$eval('.player-wrapper video', el => el.buffered.length > 0 ? '有缓冲' : '无缓冲').catch(() => '未知');
    console.log('缓冲状态:', buffered);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
