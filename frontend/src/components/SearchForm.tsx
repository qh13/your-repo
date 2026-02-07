'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchFormProps {
  initialKeyword?: string;
}

export default function SearchForm({ initialKeyword = '' }: SearchFormProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      setLoading(true);
      router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="search-input-wrapper">
        <div className="search-input-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索视频、标签、创作者..."
            className="search-input"
            disabled={loading}
          />
          {keyword && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setKeyword('')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <div className="search-glow" />
        </div>
        <button 
          type="submit" 
          className="search-button"
          disabled={loading || !keyword.trim()}
        >
          {loading ? (
            <span className="search-loading">
              <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
              搜索中...
            </span>
          ) : (
            <>
              <span>搜索</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </div>
      
      <div className="search-hints">
        <span className="hint-label">热门搜索:</span>
        <div className="hint-tags">
          {['🔥 热门', '✨ 最新', '🎵 音乐', '🎮 游戏', '🎬 电影'].map((tag) => (
            <button
              key={tag}
              type="button"
              className="hint-tag"
              onClick={() => {
                const cleanTag = tag.replace(/^[^\w]/g, '');
                setKeyword(cleanTag);
                router.push(`/search?q=${encodeURIComponent(cleanTag)}`);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
