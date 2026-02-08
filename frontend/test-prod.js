const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('=== 测试生产环境 ===');
    console.log('访问首页...');
    await page.goto('https://production.jable-frontend.pages.dev/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    const videoItems = await page.$$('.video-item');
    console.log(`首页视频: ${videoItems.length}`);
    
    const titles = await page.$$eval('.video-title:not(.skeleton)', els => els.slice(0, 3).map(el => el.textContent.trim()));
    console.log('视频标题:', titles);
    
    console.log('\n访问视频详情...');
    await page.goto('https://production.jable-frontend.pages.dev/videos/test-002/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const title = await page.$eval('h1', el => el.innerText).catch(() => '未找到');
    console.log('详情页标题:', title);
    
    console.log('\n访问分类页...');
    await page.goto('https://production.jable-frontend.pages.dev/category/recent/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const catVideos = await page.$$('.video-item');
    console.log('分类视频:', catVideos.length);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
  console.log('\n✅ 所有测试完成！');
})();
