'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Video } from '@/lib/video-data';
import { getVideoListUrl } from '@/lib/api';

// Dynamic imports to reduce main bundle size
const AdBanner = dynamic(() => import('@/components/AdBanner'), {
  ssr: false,
  loading: () => <div className="ad-placeholder" style={{ height: '100px', margin: '20px 0' }} />,
});

const VideoGrid = dynamic(() => import('@/components/VideoGrid'), {
  ssr: false,
  loading: () => <div className="video-grid-skeleton" style={{ display: 'grid', gap: '20px' }}><div className="skeleton" style={{ aspectRatio: '16/9' }} /><div className="skeleton" style={{ aspectRatio: '16/9' }} /><div className="skeleton" style={{ aspectRatio: '16/9' }} /></div>,
});

const StatsDisplay = dynamic(() => import('@/components/StatsDisplay'), {
  ssr: false,
  loading: () => <div className="stats-bar skeleton-stats" />,
});

// VideoGridProps uses the imported Video type from '@/lib/video-data'
interface VideoGridProps {
  videos?: Video[];
  title?: string;
  showHeader?: boolean;
}

function VideoGridComponent({ videos = [], title = '精彩视频', showHeader = true }: VideoGridProps) {
  const [displayVideos, setDisplayVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchVideos(1);
  }, []);

  const fetchVideos = async (pageNum: number) => {
    setLoading(true);
    try {
      const url = getVideoListUrl({ page: pageNum, limit: 12 });
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        if (pageNum === 1) {
          setDisplayVideos(data.data);
        } else {
          setDisplayVideos(prev => [...prev, ...data.data]);
        }
        setHasMore(data.data.length === 12);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchVideos(page + 1);
    }
  };

  const formatViews = (views: string) => {
    const num = parseInt(views.replace(/[^0-9]/g, '')) || 0;
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return views;
  };

  return (
    <div className="video-section">
      {showHeader && (
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">🎬</span>
            {title}
          </h2>
          <span className="video-count">
            {displayVideos.length} 个视频
          </span>
        </div>
      )}
      
      <div className="video-grid">
        {displayVideos.map((video, index) => (
          <a
            key={`${video.id}-${index}`}
            href={`/videos/${video.id}`}
            className="video-item"
          >
            <div className="video-thumbnail">
              <img 
                src={video.thumbnail} 
                alt={video.title}
                loading="lazy"
              />
              <span className="video-duration">{video.duration}</span>
              <div className="play-overlay">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="quality-badge">HD</div>
            </div>
            <div className="video-info">
              <h3 className="video-title">{video.title}</h3>
              <div className="video-meta">
                <span className="meta-author">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  {video.author}
                </span>
                <span className="meta-views">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  {formatViews(video.views)}
                </span>
              </div>
            </div>
            <div className="source-tag">{video.source}</div>
          </a>
        ))}
      </div>
      
      {/* 骨架屏加载 */}
      {loading && displayVideos.length === 0 && (
        <div className="video-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="video-item skeleton">
              <div className="video-thumbnail skeleton" />
              <div className="video-info">
                <div className="skeleton-text title" />
                <div className="skeleton-text meta" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 加载更多按钮 */}
      {!loading && displayVideos.length > 0 && hasMore && (
        <div className="load-more-container">
          <button className="load-more-btn" onClick={loadMore}>
            <span>加载更多</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}
      
      {/* 加载状态 */}
      {loading && displayVideos.length > 0 && (
        <div className="loading-more">
          <div className="loading-spinner" />
          <span>加载中...</span>
        </div>
      )}
      
      {/* 没有更多内容 */}
      {!loading && displayVideos.length > 0 && !hasMore && (
        <div className="end-of-content">
          <span>— 已经到底啦 —</span>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="home-page">
      {/* 英雄区域 */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-gradient">探索精彩视频世界</span>
          </h1>
          <p className="hero-subtitle">
            聚合全网优质内容，发现属于你的精彩
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">视频资源</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">50+</span>
              <span className="stat-label">内容来源</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">实时更新</span>
            </div>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="floating-card floating-card-1">
            <span>🎵</span>
          </div>
          <div className="floating-card floating-card-2">
            <span>🎬</span>
          </div>
          <div className="floating-card floating-card-3">
            <span>🔥</span>
          </div>
          <div className="floating-card floating-card-4">
            <span>⭐</span>
          </div>
        </div>
      </section>
      
      {/* 顶部广告 */}
      <AdBanner slotId="home-top" format="banner" />
      
      {/* 网站统计 */}
      <StatsDisplay />
      
      <div className="content-layout">
        {/* 主要内容区 */}
        <div className="main-content">
          {/* 分类标签 */}
          <div className="category-nav">
            <div className="category-list">
              <a href="/" className="category-item active">全部</a>
              <a href="/category/recent" className="category-item">最新发布</a>
              <a href="/hot" className="category-item">🔥 热门推荐</a>
              <a href="/category/entertainment" className="category-item">娱乐综艺</a>
              <a href="/category/music" className="category-item">音乐现场</a>
              <a href="/category/sports" className="category-item">体育赛事</a>
              <a href="/category/gaming" className="category-item">游戏解说</a>
              <a href="/category/tech" className="category-item">科技数码</a>
              <a href="/category/lifestyle" className="category-item">生活日常</a>
            </div>
          </div>
          
          {/* 视频网格 */}
          <VideoGridComponent />
        </div>
        
        {/* 侧边栏 */}
        <aside className="sidebar">
          {/* 热门标签 */}
          <div className="sidebar-section sidebar-glow">
            <h3 className="sidebar-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              热门标签
            </h3>
            <div className="tag-cloud">
              <span className="tag tag-hot">🔥 热门视频</span>
              <span className="tag tag-hot">⚡ 最新发布</span>
              <span className="tag">✨ 精选推荐</span>
              <span className="tag">🎭 娱乐八卦</span>
              <span className="tag">🎵 音乐现场</span>
              <span className="tag">⚽ 体育赛事</span>
              <span className="tag">🎮 游戏解说</span>
              <span className="tag">🔬 科技数码</span>
              <span className="tag">🍳 美食教程</span>
              <span className="tag">✈️ 旅游探险</span>
              <span className="tag">💄 时尚美妆</span>
              <span className="tag">🏠 家居生活</span>
            </div>
          </div>
          
          {/* 侧边广告 */}
          <AdBanner slotId="sidebar-home" format="rectangle" />
          
          {/* 关于我们 */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              关于我们
            </h3>
            <p className="about-text">
              <span className="highlight">内容聚合平台</span>，整合全网优质视频资源。
              <br /><br />
              专注于发现和分享有趣、有价值的视频内容，为用户提供一站式视频观看体验。
            </p>
            <div className="sidebar-features">
              <div className="feature-item">
                <span className="feature-icon">🚀</span>
                <span>实时更新</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💯</span>
                <span>高清画质</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>极速加载</span>
              </div>
            </div>
          </div>
          
          {/* 快捷入口 */}
          <div className="sidebar-section sidebar快捷链接">
            <h3 className="sidebar-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              快捷链接
            </h3>
            <div className="quick-links">
              <a href="/hot" className="quick-link">
                <span className="quick-link-icon">🔥</span>
                <span>热门排行</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
              <a href="/search" className="quick-link">
                <span className="quick-link-icon">🔍</span>
                <span>搜索视频</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
              <a href="/about" className="quick-link">
                <span className="quick-link-icon">ℹ️</span>
                <span>了解更多</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
