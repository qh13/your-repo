'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { getVideoList, getStats, Video, Stats } from '@/lib/video-data';

const AdBanner = dynamic(() => import('@/components/AdBanner'), { ssr: false });

// 视频卡片组件
function VideoCard({ video, priority = false }: { video: Video; priority?: boolean }) {
  return (
    <a href={`/videos/${video.id}`} className="video-item">
      <div className="video-thumb">
        {video.coverUrl ? (
          <Image
            src={video.coverUrl}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            style={{ objectFit: 'cover' }}
            priority={priority}
            unoptimized
          />
        ) : (
          <div className="skeleton" style={{ width: '100%', height: '100%' }} />
        )}
        <span className="video-duration">{video.duration || '--:--'}</span>
      </div>
      <div className="video-info">
        <h3 className="video-title">{video.title}</h3>
        <div className="video-meta">
          {video.authorName && <span>{video.authorName}</span>}
          <span>{video.views || '0'} 次观看</span>
        </div>
      </div>
    </a>
  );
}

// 骨架屏
function VideoGridSkeleton() {
  return (
    <div className="video-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="video-item">
          <div className="video-thumb skeleton" />
          <div className="video-info">
            <div className="skeleton" style={{ height: '18px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '14px', width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// 分类导航
function CategoryNav() {
  const categories = [
    { name: '全部', slug: 'all' },
    { name: '最新', slug: 'recent' },
    { name: '热门', slug: 'top' },
  ];

  return (
    <div className="category-nav">
      {categories.map((cat) => (
        <a
          key={cat.slug}
          href={cat.slug === 'all' ? '/' : `/${cat.slug === 'top' ? 'hot' : cat.slug}`}
          className={`category-item ${cat.slug === 'all' ? 'active' : ''}`}
        >
          {cat.name}
        </a>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [videosRes, statsRes] = await Promise.all([
          getVideoList({ page: 1, limit: 24 }),
          getStats(),
        ]);
        
        if (videosRes.success) {
          setVideos(videosRes.data.videos);
        }
        if (statsRes.success) {
          setStats(statsRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      {/* 统计栏 */}
      {stats && !loading && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{stats.totalVideos.toLocaleString()}</span>
            <span className="stat-label">视频</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalViews.toLocaleString()}</span>
            <span className="stat-label">观看</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalCategories}</span>
            <span className="stat-label">分类</span>
          </div>
        </div>
      )}

      {loading ? (
        <VideoGridSkeleton />
      ) : (
        <>
          <CategoryNav />
          
          <AdBanner slotId="home-top" />
          
          <section>
            <h2 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>最新视频</h2>
            <div className="video-grid">
              {videos.map((video, index) => (
                <VideoCard key={video.id} video={video} priority={index < 4} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
