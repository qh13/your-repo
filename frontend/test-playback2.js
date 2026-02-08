const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('=== 测试新抓取的视频 ===\n');
    
    // 测试 ipzz-777
    console.log('1. 测试 ipzz-777:');
    await page.goto('https://production.jable-frontend.pages.dev/videos/ipzz-777/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const title1 = await page.$eval('h1', el => el.innerText).catch(() => '未找到');
    console.log('   标题:', title1.substring(0, 40));
    
    const src1 = await page.$eval('.player-wrapper video', el => el.src).catch(() => '无src');
    console.log('   Stream URL:', src1.includes('mushroomtrack') ? '使用真实流' : src1.substring(0, 50));
    
    // 测试 ipzz-778
    console.log('\n2. 测试 ipzz-778:');
    await page.goto('https://production.jable-frontend.pages.dev/videos/ipzz-778/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const title2 = await page.$eval('h1', el => el.innerText).catch(() => '未找到');
    console.log('   标题:', title2.substring(0, 40));
    
    // 测试首页
    console.log('\n3. 测试首页视频列表:');
    await page.goto('https://production.jable-frontend.pages.dev/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    const videoItems = await page.$$('.video-item');
    console.log('   视频数量:', videoItems.length);
    
    const titles = await page.$$eval('.video-title:not(.skeleton)', els => els.slice(0, 5).map(el => el.textContent.trim()));
    console.log('   标题:', titles);
    
  } catch (error) {
    console.error('错误:', error.message);
  }
  
  await browser.close();
  console.log('\n✅ 测试完成');
})();
