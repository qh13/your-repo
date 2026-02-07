'use client';

import { useState, useEffect } from 'react';
import { getStats, Stats } from '@/lib/video-data';
import Link from 'next/link';

export default function StatsDisplay() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{slug: string; name: string}>>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsResult, categoriesResult] = await Promise.all([
          getStats(),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/categories`).then(r => r.json()).catch(() => null)
        ]);
        
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
        
        if (categoriesResult?.success) {
          setCategories(categoriesResult.data.categories.slice(0, 8));
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // 分类导航
  const categoryNav = [
    { name: '全部', slug: 'all' },
    { name: '最新', slug: 'recent' },
    { name: '热门', slug: 'top' },
    ...categories.filter(c => !['all', 'recent', 'top', 'uncategorized'].includes(c.slug))
  ];

  return (
    <>
      {/* 统计信息 */}
      {stats && !loading && (
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalVideos.toLocaleString()}</span>
              <span className="stat-label">视频</span>
            </div>
            <div className="stat-glow" />
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalViews.toLocaleString()}</span>
              <span className="stat-label">观看</span>
            </div>
            <div className="stat-glow" />
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalCategories}</span>
              <span className="stat-label">分类</span>
            </div>
            <div className="stat-glow" />
          </div>
        </div>
      )}
      
      {/* 骨架屏 */}
      {loading && (
        <div className="stats-bar skeleton-stats">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-item skeleton">
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-text" style={{ width: '60px' }} />
                <div className="skeleton-text" style={{ width: '40px' }} />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 分类导航 */}
      <section className="category-nav">
        <div className="category-list">
          {categoryNav.map((cat) => (
            <Link 
              key={cat.slug} 
              href={cat.slug === 'all' ? '/' : `/${cat.slug === 'top' ? 'hot' : cat.slug}`}
              className="category-item"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
