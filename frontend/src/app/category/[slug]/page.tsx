import dynamic from 'next/dynamic';

const AdBanner = dynamic(() => import('@/components/AdBanner'));
const VideoGrid = dynamic(() => import('@/components/VideoGrid'));

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

const categoryNames: Record<string, string> = {
  'recent': '📅 最新发布',
  'top': '🔥 热门推荐',
  'models': '⭐ 精选模特',
  'uncategorized': '📁 未分类'
};

export async function generateStaticParams() {
  // 为所有已知分类生成静态页面
  const categories = ['recent', 'top', 'models', 'uncategorized'];
  return categories.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const title = categoryNames[resolvedParams.slug] || resolvedParams.slug;
  
  return {
    title: `${title} - 视频聚合平台`,
    description: `浏览${title}分类的精彩视频`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const title = categoryNames[slug] || slug;
  
  const category = slug === 'top' ? 'hot' : slug;

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>{title}</h1>
      
      <AdBanner slotId="category-top" />
      
      <VideoGrid category={category} showPagination={true} />
    </div>
  );
}
