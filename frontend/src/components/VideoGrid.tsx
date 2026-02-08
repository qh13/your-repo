'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getVideoList, getHotVideos, Video } from '@/lib/video-data';

interface VideoGridProps {
  category?: string;
  showPagination?: boolean;
}

// 视频卡片组件 - 使用普通 <a> 标签以兼容 Cloudflare Pages
function VideoCard({ video }: { video: Video }) {
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
            priority={false}
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

export default function VideoGrid({ category, showPagination = true }: VideoGridProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        
        let result;
        if (category === 'hot') {
          result = await getHotVideos(24);
        } else {
          result = await getVideoList({ page, limit: 24, category: category || 'all' });
        }
        
        if (result.success) {
          setVideos(result.data.videos);
          setTotalPages(result.data.pagination.totalPages);
          setTotalVideos(result.data.pagination.total);
        }
      } catch (err) {
        console.error('Failed to fetch videos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, [category, page]);

  if (loading) {
    return <VideoGridSkeleton />;
  }

  if (videos.length === 0) {
    return (
      <div className="empty">
        <p>暂无视频</p>
      </div>
    );
  }

  const title = category === 'hot' ? '热门推荐' : '最新视频';

  return (
    <section>
      <h2 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>{title}</h2>
      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* 分页 */}
      {showPagination && totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            上一页
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            
            return (
              <button
                key={pageNum}
                className={`page-btn ${page === pageNum ? 'active' : ''}`}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button 
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            下一页
          </button>
        </div>
      )}
    </section>
  );
}
