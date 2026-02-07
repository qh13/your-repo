'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getVideoList, getHotVideos, Video } from '@/lib/video-data';

interface VideoGridProps {
  category?: string;
  initialVideos?: Video[];
  showPagination?: boolean;
}

export default function VideoGrid({ 
  category, 
  initialVideos = [],
  showPagination = true 
}: VideoGridProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [loading, setLoading] = useState(!initialVideos.length);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        setError(null);
        
        const result = category === 'hot' 
          ? await getHotVideos(24)
          : await getVideoList({ 
              page, 
              limit: 24, 
              category: category || 'all' 
            });
        
        if (result.success) {
          setVideos(result.data.videos);
          setTotalPages(result.data.pagination.totalPages);
          setTotalVideos(result.data.pagination.total);
        } else {
          setError(result.error || '获取视频列表失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取视频失败');
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, [category, page]);

  if (loading) {
    return (
      <section className="video-section">
        <h2 className="section-title">
          {category === 'hot' ? '热门推荐' : '最新视频'}
        </h2>
        <div className="video-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="video-item skeleton">
              <div className="video-thumbnail skeleton-image" />
              <div className="video-info">
                <div className="skeleton-text title" />
                <div className="skeleton-text meta" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="video-section">
        <h2 className="section-title">视频列表</h2>
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            重新加载
          </button>
        </div>
      </section>
    );
  }

  if (videos.length === 0) {
    return (
      <section className="video-section">
        <h2 className="section-title">视频列表</h2>
        <div className="empty-message">
          <p>📭 暂无视频</p>
          <p className="hint">请稍后再试或尝试其他分类</p>
        </div>
      </section>
    );
  }

  return (
    <section className="video-section">
      <div className="section-header">
        <h2 className="section-title">
          {category === 'hot' ? '🔥 热门推荐' : '最新视频'}
        </h2>
        <span className="video-count">共 {totalVideos} 个视频</span>
      </div>
      
      <div className="video-grid">
        {videos.map((video, index) => (
          <Link
            key={video.id}
            href={`/videos/${video.id}`}
            className="video-item"
          >
            <div className="video-thumbnail">
              {video.coverUrl ? (
                <Image
                  src={video.coverUrl}
                  alt={video.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  style={{ objectFit: 'cover' }}
                  priority={index < 4}
                  onError={(e) => {
                    // 图片加载失败时显示占位图
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.jpg';
                  }}
                />
              ) : (
                <div className="placeholder-image" />
              )}
              <span className="video-duration">{video.duration || '--:--'}</span>
              <span className="video-views-count">{video.views || '0'}</span>
            </div>
            <div className="video-info">
              <h3 className="video-title">{video.title}</h3>
              <div className="video-meta">
                {video.authorName && (
                  <span className="video-author">{video.authorName}</span>
                )}
                <span className="video-views">{video.views || '0'} 次观看</span>
              </div>
              {video.categoryName && (
                <span className="video-category-tag">{video.categoryName}</span>
              )}
            </div>
          </Link>
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
          
          <div className="page-numbers">
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
          </div>
          
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
