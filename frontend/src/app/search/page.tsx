import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const AdBanner = dynamic(() => import('@/components/AdBanner'), {
  loading: () => <div style={{ height: '100px', margin: '20px 0' }} />,
});

const VideoGrid = dynamic(() => import('@/components/VideoGrid'), {
  loading: () => <div className="video-grid-skeleton" style={{ display: 'grid', gap: '20px' }}><div className="skeleton" style={{ aspectRatio: '16/9' }} /><div className="skeleton" style={{ aspectRatio: '16/9' }} /><div className="skeleton" style={{ aspectRatio: '16/9' }} /></div>,
});

const SearchForm = dynamic(() => import('@/components/SearchForm'), {
  loading: () => <div className="search-form-skeleton" style={{ maxWidth: '900px', margin: '0 auto' }}><div className="skeleton" style={{ height: '56px', borderRadius: '28px' }} /></div>,
});

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const metadata: Metadata = {
  title: '🔍 搜索视频 - 发现精彩',
  description: '搜索精彩视频内容',
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const keyword = params.q || '';

  return (
    <div className="search-page">
      {/* 搜索英雄区域 */}
      <section className="hero-section" style={{ flexDirection: 'column', textAlign: 'center' }}>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-gradient">
              {keyword ? `🔍 搜索: "${keyword}"` : '🔍 搜索视频'}
            </span>
          </h1>
          <p className="hero-subtitle">
            探索海量视频内容，找到属于你的精彩
          </p>
        </div>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          <SearchForm initialKeyword={keyword} />
        </div>
      </section>
      
      <AdBanner slotId="search-top" format="banner" />

      {keyword && (
        <VideoGrid
          showPagination={true}
        />
      )}
    </div>
  );
}
