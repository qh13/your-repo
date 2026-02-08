const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('访问首页...');
    await page.goto('https://44421345.jable-frontend.pages.dev/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // 检查视频项
    const videoItems = await page.$$('.video-item');
    console.log(`视频项: ${videoItems.length}`);
    
    // 检查骨架屏
    const skeletons = await page.$$('.video-item .skeleton');
    console.log(`骨架屏: ${skeletons.length}`);
    
    // 获取真实视频标题
    const titles = await page.$$eval('.video-title:not(.skeleton)', els => els.slice(0, 5).map(el => el.textContent.trim()));
    console.log('视频标题:', titles);
    
    // 检查视频缩略图
    const images = await page.$$eval('.video-item img', els => els.slice(0, 3).map(el => el.src));
    console.log('缩略图:', images);
    
    // 检查统计栏
    const stats = await page.$eval('.stats-bar', el => el.innerText).catch(() => '未找到');
    console.log('统计:', stats);
    
    // 检查分类导航
    const categories = await page.$$eval('.category-item', els => els.map(el => el.textContent));
    console.log('分类:', categories);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
})();
