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
    <form onSubmit={handleSubmit} className="search-box">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索视频..."
        className="search-input"
        disabled={loading}
      />
      <button type="submit" className="search-btn" disabled={loading || !keyword.trim()}>
        {loading ? '搜索中...' : '搜索'}
      </button>
    </form>
  );
}
