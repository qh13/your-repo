'use client';

import { useState, useEffect } from 'react';
import { getStats, Stats } from '@/lib/video-data';

export default function StatsDisplay() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const result = await getStats();
        if (result.success && result.data) {
          setStats(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="stats-bar">
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-item">
            <div className="skeleton" style={{ width: '60px', height: '32px', marginBottom: '4px' }} />
            <div className="skeleton" style={{ width: '40px', height: '16px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
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
  );
}
