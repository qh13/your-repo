'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const VideoGrid = dynamic(() => import('@/components/VideoGrid'), { ssr: false });

// 搜索表单组件
function SearchForm({ initialKeyword }: { initialKeyword: string }) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="search-box">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索视频..."
        className="search-input"
      />
      <button type="submit" className="search-btn">
        搜索
      </button>
    </form>
  );
}

// 搜索内容组件
function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  if (!q) {
    return (
      <div className="empty">
        <p>输入关键词搜索视频</p>
      </div>
    );
  }

  return (
    <>
      <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
        搜索: "{q}"
      </p>
      <VideoGrid category={`search:${q}`} showPagination={true} />
    </>
  );
}

export default function SearchPage() {
  return (
    <div>
      <Suspense fallback={
        <form className="search-box">
          <input
            type="text"
            placeholder="搜索视频..."
            className="search-input"
            disabled
          />
          <button type="submit" className="search-btn" disabled>
            搜索
          </button>
        </form>
      }>
        <SearchForm initialKeyword="" />
      </Suspense>
      
      <Suspense fallback={
        <div className="empty">
          <p>加载中...</p>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  );
}
