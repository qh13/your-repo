import { Metadata } from 'next';
import AdBanner from '@/components/AdBanner';
import VideoGrid from '@/components/VideoGrid';

export const metadata: Metadata = {
  title: '🔥 热门视频 - 发现精彩',
  description: '观看最热门的精彩视频内容',
};

export default function HotPage() {
  return (
    <div className="hot-page">
      {/* 英雄区域 */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-gradient">🔥 热门视频</span>
          </h1>
          <p className="hero-subtitle">
            发现最受欢迎的视频内容，感受热度魅力
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-number">TOP 100</span>
              <span className="stat-label">热门排行</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">🔥</span>
              <span className="stat-label">热度飙升</span>
            </div>
            <div className="hero-stat">
              <span className="stat-number">⭐</span>
              <span className="stat-label">精选推荐</span>
            </div>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="floating-card floating-card-1">
            <span>🔥</span>
          </div>
          <div className="floating-card floating-card-2">
            <span>⭐</span>
          </div>
          <div className="floating-card floating-card-3">
            <span>🏆</span>
          </div>
        </div>
      </section>
      
      <AdBanner slotId="hot-top" format="banner" />
      
      <div className="content-layout">
        <div className="main-content">
          <VideoGrid 
            category="hot"
            showPagination={true}
          />
        </div>
        
        <aside className="sidebar">
          {/* 热门榜单 */}
          <div className="sidebar-section sidebar-glow">
            <h3 className="sidebar-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              热门榜单
            </h3>
            <div className="hot-rank-list">
              <div className="hot-rank-item">
                <span className="rank-number rank-1">1</span>
                <span className="rank-title">🔥 今日热搜</span>
              </div>
              <div className="hot-rank-item">
                <span className="rank-number rank-2">2</span>
                <span className="rank-title">⭐ 本周热门</span>
              </div>
              <div className="hot-rank-item">
                <span className="rank-number rank-3">3</span>
                <span className="rank-title">🚀 飙升榜</span>
              </div>
              <div className="hot-rank-item">
                <span className="rank-number">4</span>
                <span className="rank-title">💯 精选推荐</span>
              </div>
              <div className="hot-rank-item">
                <span className="rank-number">5</span>
                <span className="rank-title">🎬 经典回顾</span>
              </div>
            </div>
          </div>
          
          <AdBanner slotId="sidebar-hot" format="rectangle" />
        </aside>
      </div>
    </div>
  );
}
