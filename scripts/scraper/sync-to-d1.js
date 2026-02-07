/**
 * 数据同步脚本 - 将本地 JSON 数据同步到 D1 数据库
 * 
 * 用法:
 *   node sync-to-d1.js              # 同步所有视频
 *   node sync-to-d1.js --video-id=xxx  # 同步单个视频
 */

const fs = require('fs-extra');
const path = require('path');

// 配置
const CONFIG = {
  VIDEOS_FILE: './data/videos.json',
  WORKER_URL: 'https://jable-video-proxy.qh13.workers.dev',
};

/**
 * 保存视频到 D1
 */
async function saveVideoToD1(video) {
  try {
    const response = await fetch(`${CONFIG.WORKER_URL}/api/admin/save-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: video.id,
        title: video.title || '',
        description: video.description || '',
        duration: video.duration || '',
        views: video.views || '',
        publishDate: video.publishDate || '',
        coverUrl: video.coverUrl || '',
        thumbnailUrl: video.coverUrl || '', // 使用封面作为缩略图
        sourceUrl: `https://jable.tv/videos/${video.id}/`,
        category: video.category || 'uncategorized',
        author: video.author || { name: '', avatarUrl: '' },
        tags: video.tags || [],
        streamUrls: video.streamUrls || { primary: null, backups: [], qualities: {} },
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`  ✅ ${video.id}: ${result.action === 'created' ? '新建' : '更新'}成功`);
    } else {
      console.log(`  ❌ ${video.id}: 失败 - ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.log(`  ❌ ${video.id}: 异常 - ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 加载本地视频数据
 */
function loadLocalVideos() {
  if (!fs.existsSync(CONFIG.VIDEOS_FILE)) {
    console.log(`❌ 文件不存在: ${CONFIG.VIDEOS_FILE}`);
    return [];
  }

  const data = fs.readJsonSync(CONFIG.VIDEOS_FILE);
  console.log(`📁 从本地文件加载了 ${data.length} 个视频`);
  return data;
}

/**
 * 同步单个视频
 */
async function syncSingleVideo(videoId) {
  console.log(`\n🔄 同步单个视频: ${videoId}`);
  
  const videos = loadLocalVideos();
  const video = videos.find(v => v.id === videoId);
  
  if (!video) {
    console.log(`❌ 未找到视频: ${videoId}`);
    return;
  }
  
  await saveVideoToD1(video);
}

/**
 * 同步所有视频
 */
async function syncAllVideos() {
  console.log('🔄 开始同步所有视频到 D1 数据库...\n');
  
  const videos = loadLocalVideos();
  
  if (videos.length === 0) {
    console.log('⚠️ 没有需要同步的视频');
    return;
  }
  
  console.log(`📊 共 ${videos.length} 个视频待同步\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const video of videos) {
    const result = await saveVideoToD1(video);
    if (result.success) {
      success++;
    } else {
      failed++;
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📈 同步完成: ${success} 成功, ${failed} 失败`);
}

/**
 * 主程序
 */
async function main() {
  const args = process.argv.slice(2);
  const videoIdArg = args.find(arg => arg.startsWith('--video-id='));
  const videoId = videoIdArg ? videoIdArg.split('=')[1] : null;
  
  try {
    if (videoId) {
      await syncSingleVideo(videoId);
    } else {
      await syncAllVideos();
    }
  } catch (error) {
    console.error('❌ 同步失败:', error);
    process.exit(1);
  }
}

main();
