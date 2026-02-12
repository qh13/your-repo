#!/usr/bin/env node
/**
 * 数据同步工具 - 将本地 JSON 数据同步到 D1 数据库
 * 
 * 支持两种同步方式:
 * 1. 通过 Worker API 同步 (需要网络可达)
 * 2. 直接执行 SQL (需要 wrangler CLI)
 * 
 * 用法:
 *   node sync-data.js              # 交互式选择同步方式
 *   node sync-data.js --api        # 通过 Worker API 同步
 *   node sync-data.js --sql        # 直接执行 SQL
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  VIDEOS_FILE: './data/videos.json',
  WORKER_URL: 'https://jable-video-proxy.qh13.workers.dev',
  WORKER_DIR: path.resolve(__dirname, '../../worker'),
  SYNC_SQL_FILE: path.resolve(__dirname, './data/sync-videos.sql'),
};

/**
 * 通过 Worker API 同步
 */
async function syncViaApi() {
  console.log('🔄 正在通过 Worker API 同步...\n');

  // 先检查 API 连通性
  const connected = await checkConnectivity();
  if (!connected) {
    console.log(`❌ 无法连接到 Worker API: ${CONFIG.WORKER_URL}`);
    console.log('请检查:');
    console.log('  1. Worker 是否已部署');
    console.log('  2. 网络连接是否正常');
    console.log('  3. 可以尝试手动访问: curl -I ' + CONFIG.WORKER_URL);
    return;
  }

  const videos = loadLocalVideos();
  if (videos.length === 0) return;

  let success = 0, failed = 0;

  for (const video of videos) {
    try {
      const res = await fetch(`${CONFIG.WORKER_URL}/api/admin/save-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatVideoForApi(video))
      });

      let result;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await res.json();
      } else {
        result = { action: `HTTP ${res.status}` };
      }

      console.log(`  ${res.ok && result.success ? '✅' : '❌'} ${video.id}: ${result.action || result.error || result.message || 'Unknown'}`);
      (res.ok && result.success) ? success++ : failed++;
    } catch (e) {
      console.log(`  ❌ ${video.id}: ${e.message}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n📈 完成: ${success} 成功, ${failed} 失败`);
}

/**
 * 直接执行 SQL 同步
 */
function syncViaSql() {
  console.log('🔄 正在通过 SQL 直接同步...\n');

  const videos = loadLocalVideos();
  if (videos.length === 0) return;

  const sqlStatements = videos.map(video => generateInsertSql(video)).join('\n');
  const sqlFile = CONFIG.SYNC_SQL_FILE;

  fs.writeFileSync(sqlFile, sqlStatements);
  console.log(`📄 生成 SQL 文件: ${sqlFile}`);

  // 检查 worker 目录是否存在
  if (!fs.existsSync(CONFIG.WORKER_DIR)) {
    console.log(`❌ Worker 目录不存在: ${CONFIG.WORKER_DIR}`);
    fs.removeSync(sqlFile);
    return;
  }

  try {
    const cmd = `cd "${CONFIG.WORKER_DIR}" && npx wrangler d1 execute jable-videos --remote --file="${sqlFile}"`;
    console.log(`🚀 执行命令: ${cmd}`);
    execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
    console.log('✅ SQL 执行成功!\n');
  } catch (e) {
    console.log(`❌ SQL 执行失败: ${e.message}`);
    if (e.stdout) console.log(e.stdout);
    if (e.stderr) console.log(e.stderr);
  } finally {
    fs.removeSync(sqlFile);
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
  console.log(`📁 加载了 ${data.length} 个视频\n`);
  return data;
}

/**
 * 格式化视频数据用于 API
 */
function formatVideoForApi(video) {
  return {
    id: video.id,
    title: video.title || '视频标题待补充',
    description: video.description || '',
    duration: video.duration || '',
    views: video.views || '',
    publishDate: video.publishDate || '',
    coverUrl: video.coverUrl || '',
    thumbnailUrl: video.coverUrl || '',
    sourceUrl: `https://jable.tv/videos/${video.id}/`,
    category: video.category || 'uncategorized',
    author: video.author || { name: '', avatarUrl: '' },
    tags: video.tags || [],
    streamUrls: video.streamUrls || { primary: null, backups: [], qualities: {} },
  };
}

/**
 * 生成 INSERT SQL
 */
function generateInsertSql(video) {
  const v = formatVideoForApi(video);
  return `INSERT OR REPLACE INTO videos (
    id, title, description, duration, views, publish_date,
    cover_url, thumbnail_url, source_url, category,
    author_name, author_avatar_url, tags,
    stream_primary_url, stream_backup_urls, stream_qualities,
    scraped_at, updated_at, view_count
) VALUES (
    '${v.id}',
    '${v.title.replace(/'/g, "''")}',
    '${v.description.replace(/'/g, "''")}',
    '${v.duration}',
    '${v.views}',
    ${v.publishDate ? `'${v.publishDate}'` : 'NULL'},
    '${v.coverUrl}',
    '${v.thumbnailUrl}',
    '${v.sourceUrl}',
    '${v.category}',
    '${v.author.name.replace(/'/g, "''")}',
    '${v.author.avatarUrl}',
    '${JSON.stringify(v.tags).replace(/'/g, "\\'")}',
    '${v.streamUrls.url || v.streamUrls.primary || ''}',
    '${JSON.stringify(v.streamUrls.backups || [])}',
    '${JSON.stringify(v.streamUrls.qualities || {})}',
    '${video.scrapedAt || new Date().toISOString()}',
    datetime('now'),
    0
);`;
}

/**
 * 检查 Worker API 连通性
 */
async function checkConnectivity() {
  try {
    const res = await fetch(`${CONFIG.WORKER_URL}/api/stats`, { timeout: 5000 });
    return res.ok;
  } catch {
    return false;
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(a => a.startsWith('--'))?.slice(2) || 'auto';

  console.log('========================================');
  console.log('   D1 数据同步工具');
  console.log('========================================\n');

  if (mode === 'sql') {
    syncViaSql();
    return;
  }

  if (mode === 'api') {
    await syncViaApi();
    return;
  }

  // auto 模式
  console.log(`🌐 检查 Worker API 连通性: ${CONFIG.WORKER_URL}`);
  const connected = await checkConnectivity();
  if (connected) {
    console.log('✅ Worker API 可达，使用 API 方式同步\n');
    await syncViaSql();
  } else {
    console.log('⚠️ Worker API 不可达，使用 SQL 方式同步\n');
    syncViaSql();
  }
}

main().catch(console.error);
