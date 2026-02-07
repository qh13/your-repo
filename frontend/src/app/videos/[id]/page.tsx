import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '@/lib/api';

// Dynamic imports to reduce main bundle size
const AdBanner = dynamic(() => import('@/components/AdBanner'), {
  loading: () => <div className="ad-placeholder" style={{ height: '100px', margin: '20px 0' }} />,
});

const DirectVideoPlayer = dynamic(() => import('@/components/DirectVideoPlayer'), {
  loading: () => <div className="player-placeholder" style={{ aspectRatio: '16/9', background: '#000' }} />,
});

// 视频详情响应类型
interface VideoDetailResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    description: string;
    duration: string;
    views: string;
    publishDate: string;
    coverUrl: string;
    category: string;
    categoryName: string;
    authorName: string;
    tags: string[];
    streamUrl: string;
    streamBackupUrls?: string[];
    streamQualities?: Record<string, string>;
  };
  error?: string;
}

/**
 * 从 API 获取视频详情
 */
async function getVideoDetail(id: string): Promise<VideoDetailResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
      next: { revalidate: 60 } // 缓存 60 秒
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching video detail:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const response = await getVideoDetail(id);
  
  if (!response?.success) {
    return {
      title: '视频未找到 - 视频聚合平台',
    };
  }

  const video = response.data;
  return {
    title: `${video.title} - 视频聚合平台`,
    description: video.description || '观看精彩视频',
    openGraph: {
      title: video.title,
      description: video.description,
      images: [video.coverUrl],
    },
  };
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await getVideoDetail(id);

  // 如果 API 获取失败，尝试使用本地模拟数据作为后备
  let video = response?.data;

  if (!video) {
    // 后备：使用简化的本地数据
    video = {
      id: id,
      title: `视频详情 - ${id}`,
      description: '视频描述加载中...',
      duration: '--:--',
      views: '0',
      publishDate: new Date().toISOString().split('T')[0],
      coverUrl: `https://picsum.photos/seed/${id}/1280/720`,
      category: 'unknown',
      categoryName: '未知分类',
      authorName: '未知作者',
      tags: [],
      streamUrl: '',
    };
  }

  // 获取视频流 URL
  const streamUrl = video.streamUrl || '';

  return (
    <div className="video-page">
      {/* 顶部广告 */}
      <AdBanner slotId="video-top" format="banner" />

      <div className="video-layout">
        {/* 主要播放区 */}
        <div className="video-main">
          {/* 直接播放视频（不使用 iframe） */}
          <div className="player-container">
            {streamUrl ? (
              <DirectVideoPlayer
                videoId={id}
                streamUrl={streamUrl}
                backupUrls={video.streamBackupUrls || []}
                poster={video.coverUrl}
                autoplay={false}
              />
            ) : (
              <div className="video-placeholder">
                <div className="placeholder-content">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                  </svg>
                  <p>视频加载中...</p>
                  <span>ID: {id}</span>
                </div>
              </div>
            )}
          </div>

          {/* 视频信息头部 */}
          <div className="video-header">
            <h1 className="video-title">{video.title}</h1>
            <div className="video-meta">
              <span className="meta-item">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {video.views} 次观看
              </span>
              <span className="meta-item">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
                {video.duration}
              </span>
              <span className="meta-item">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {video.publishDate}
              </span>
            </div>
          </div>

          {/* 视频描述 */}
          <div className="video-section">
            <div className="author-info">
              <div className="author-avatar-placeholder">
                {video.authorName?.charAt(0) || 'U'}
              </div>
              <div className="author-details">
                <span className="author-name">{video.authorName || '未知作者'}</span>
                <span className="author-label">上传者</span>
              </div>
            </div>
            <div className="video-description">
              <h3>视频描述</h3>
              <p>{video.description}</p>
            </div>
          </div>

          {/* 标签 */}
          {video.tags && video.tags.length > 0 && (
            <div className="video-tags">
              <h3>标签</h3>
              <div className="tag-list">
                {video.tags.map((tag: string, index: number) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* 来源信息 */}
          <div className="source-info">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>视频来源：</span>
            <a href={`https://jable.tv/videos/${id}/`} target="_blank" rel="noopener noreferrer">
              jable.tv
            </a>
          </div>

          {/* 视频间广告 */}
          <AdBanner slotId="video-infeed" format="horizontal" />

          {/* 相关视频 */}
          <section className="related-videos">
            <h2 className="section-title">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              相关视频
            </h2>
            <div className="related-grid">
              {[1, 2, 3, 4].map((i) => (
                <a key={i} href={`/videos/video-${i}`} className="related-item">
                  <div className="related-thumbnail">
                    <img
                      src={`https://picsum.photos/seed/related${i}/320/180`}
                      alt={`相关视频 ${i}`}
                    />
                    <span className="duration">08:30</span>
                    <div className="play-overlay">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                  <div className="related-info">
                    <h4>相关视频标题 {i}</h4>
                    <span>500K 次观看</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* 侧边栏 */}
        <aside className="video-sidebar">
          <div className="sidebar-section">
            <h3>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              热门视频
            </h3>
            <div className="sidebar-video-list">
              {[1, 2, 3, 4, 5].map((i) => (
                <a key={i} href={`/videos/video-${i}`} className="sidebar-video-item">
                  <div className="sidebar-thumbnail">
                    <img
                      src={`https://picsum.photos/seed/hot${i}/120/68`}
                      alt={`热门视频 ${i}`}
                    />
                    <span className="duration">12:45</span>
                  </div>
                  <div className="sidebar-video-info">
                    <h4>热门视频标题 {i}</h4>
                    <span>200K 次观看</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* 分类标签 */}
          {video.categoryName && (
            <div className="sidebar-section">
              <h3>分类</h3>
              <div className="category-tags">
                <span className="category-tag">{video.categoryName}</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
