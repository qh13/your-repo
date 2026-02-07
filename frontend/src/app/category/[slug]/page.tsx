import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const AdBanner = dynamic(() => import('@/components/AdBanner'), {
  loading: () => <div style={{ height: '100px', margin: '20px 0' }} />,
});

const VideoGrid = dynamic(() => import('@/components/VideoGrid'), {
  loading: () => <div className="video-grid-skeleton" style={{ display: 'grid', gap: '20px' }}><div className="skeleton" style={{ aspectRatio: '16/9' }} /><div className="skeleton" style={{ aspectRatio: '16/9' }} /><div className="skeleton" style={{ aspectRatio: '16/9' }} /></div>,
});

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const categoryNames: Record<string, string> = {
    'recent': '📅 最新发布',
    'top': '🔥 热门推荐',
    'models': '⭐ 精选模特',
    'uncategorized': '📁 未分类'
  };
  
  const title = categoryNames[resolvedParams.slug] || resolvedParams.slug;
  
  return {
    title: `${title} - 视频聚合平台`,
    description: `浏览${title}分类的精彩视频内容`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  
  const categoryNames: Record<string, string> = {
    'recent': '📅 最新发布',
    'top': '🔥 热门推荐',
    'models': '⭐ 精选模特',
    'uncategorized': '📁 未分类'
  };
  
  const pageTitle = categoryNames[slug] || slug;
  
  return (
    <div className="category-page">
      {/* 分类英雄区域 */}
      <section className="hero-section" style={{ flexDirection: 'column', textAlign: 'center' }}>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-gradient">{pageTitle}</span>
          </h1>
          <p className="hero-subtitle">
            浏览 {pageTitle} 分类的精彩视频内容
          </p>
        </div>
      </section>
      
      <AdBanner slotId="category-top" format="banner" />
      
      <VideoGrid 
        category={slug === 'top' ? 'hot' : slug}
        showPagination={true}
      />
    </div>
  );
}
