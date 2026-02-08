const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('正在访问首页...');
    await page.goto('https://jable-frontend.pages.dev/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // 等待视频列表加载
    await page.waitForTimeout(5000);
    
    // 检查是否有视频元素（非骨架屏）
    const skeletons = await page.$$('.video-item .skeleton');
    const videoItems = await page.$$('.video-item');
    
    console.log(`总视频项: ${videoItems.length}`);
    console.log(`骨架屏数量: ${skeletons.length}`);
    
    // 获取实际的视频卡片（非骨架屏）
    const realVideos = await page.$$('.video-item:not(.skeleton)');
    console.log(`真实视频卡片: ${realVideos.length}`);
    
    // 获取视频标题
    const titles = await page.$$eval('.video-title:not(.skeleton)', els => els.slice(0, 5).map(el => el.textContent.trim()));
    console.log('视频标题:', titles);
    
    // 检查统计栏
    const stats = await page.$eval('.stats-bar', el => el.innerText).catch(() => '未找到统计栏');
    console.log('统计栏内容:', stats);
    
    // 检查分类导航
    const categories = await page.$$eval('.category-item', els => els.map(el => el.textContent.trim()));
    console.log('分类:', categories);
    
    // 截图
    await page.screenshot({ path: '/tmp/screenshot.png', fullPage: true });
    console.log('截图已保存到 /tmp/screenshot.png');
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
