/**
 * D1 数据库客户端
 * 用于将抓取的数据写入 Cloudflare D1
 */

const WORKER_URL = process.env.WORKER_URL || 'https://jable-video-proxy.qh13.workers.dev';

/**
 * 保存视频到 D1 数据库
 */
export async function saveVideoToD1(video: any): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${WORKER_URL}/api/admin/save-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(video),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to save video to D1:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 批量保存视频
 */
export async function saveVideosBatchToD1(videos: any[]): Promise<{
  success: boolean;
  saved: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    success: true,
    saved: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const video of videos) {
    const result = await saveVideoToD1(video);
    if (result.success) {
      results.saved++;
    } else {
      results.failed++;
      results.errors.push(`${video.id}: ${result.error}`);
    }
  }

  return results;
}

/**
 * 从 D1 获取视频统计
 */
export async function getD1Stats(): Promise<any> {
  try {
    const response = await fetch(`${WORKER_URL}/api/stats`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get D1 stats:', error);
    return null;
  }
}

/**
 * 从 D1 获取视频列表
 */
export async function getD1Videos(params: {
  page?: number;
  limit?: number;
  category?: string;
} = {}): Promise<any> {
  try {
    const url = new URL(`${WORKER_URL}/api/videos`);
    if (params.page) url.searchParams.set('page', params.page.toString());
    if (params.limit) url.searchParams.set('limit', params.limit.toString());
    if (params.category) url.searchParams.set('category', params.category);
    
    const response = await fetch(url.toString());
    return await response.json();
  } catch (error) {
    console.error('Failed to get videos from D1:', error);
    return null;
  }
}

/**
 * 检查视频是否已存在
 */
export async function checkVideoExists(videoId: string): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/api/videos/${videoId}`);
    const result = await response.json();
    return result.success && result.data !== null;
  } catch {
    return false;
  }
}

/**
 * 获取已存在的视频 ID 列表
 */
export async function getExistingVideoIds(batchSize: number = 1000): Promise<string[]> {
  try {
    const videos = await getD1Videos({ limit: batchSize });
    if (videos?.success) {
      return videos.data.videos.map((v: any) => v.id);
    }
    return [];
  } catch {
    return [];
  }
}
