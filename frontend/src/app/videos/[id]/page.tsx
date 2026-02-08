import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

const AdBanner = dynamic(() => import('@/components/AdBanner'));
const DirectVideoPlayer = dynamic(() => import('@/components/DirectVideoPlayer'));

// 视频详情响应类型
interface VideoDetailResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    description: string;
    duration: string;
    views: string;
    publishDate: string;
    coverUrl: string;
    category: string;
    categoryName: string;
    authorName: string;
    tags: string[];
    streamUrl: string;
    streamBackupUrls?: string[];
  };
}

async function getVideoDetail(id: string): Promise<VideoDetailResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching video detail:', error);
    return null;
  }
}

// 为静态导出生成视频页面参数
export async function generateStaticParams() {
  // 预生成测试视频页面（包括新的真实视频）
  const testIds = ['test-001', 'test-002', 'ipzz-777', 'ipzz-778', 'ipzz-776', 'fns-055', 'ipzz-782', 'demo-001'];
  return testIds.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const response = await getVideoDetail(id);
  
  if (!response?.success) {
    return { title: '视频未找到 - 视频聚合平台' };
  }

  return {
    title: `${response.data.title} - 视频聚合平台`,
    description: response.data.description,
    openGraph: { title: response.data.title, description: response.data.description, images: [response.data.coverUrl] },
  };
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await getVideoDetail(id);
  const video = response?.data;

  // 备用数据
  const fallbackVideo = {
    id,
    title: `视频详情 - ${id}`,
    description: '视频描述加载中...',
    duration: '--:--',
    views: '0',
    publishDate: new Date().toISOString().split('T')[0],
    coverUrl: `https://picsum.photos/seed/${id}/1280/720`,
    category: 'unknown',
    categoryName: '未知分类',
    authorName: '未知作者',
    tags: [],
    streamUrl: '',
  };

  const v = video || fallbackVideo;

  return (
    <div>
      <AdBanner slotId="video-top" />

      {/* 播放器 */}
      <div className="player-wrapper">
        {v.streamUrl ? (
          <DirectVideoPlayer videoId={id} streamUrl={v.streamUrl} poster={v.coverUrl} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
            <span>视频加载中... (ID: {id})</span>
          </div>
        )}
      </div>

      {/* 视频信息 */}
      <div className="video-detail-info">
        <h1>{v.title}</h1>
        
        <div className="video-stats">
          <span>{v.views} 次观看</span>
          <span>{v.duration}</span>
          <span>{v.publishDate}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            {v.authorName?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{v.authorName || '未知作者'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>上传者</div>
          </div>
        </div>

        {v.description && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{v.description}</p>
        )}

        {v.tags && v.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            {v.tags.map((tag, i) => (
              <Link key={i} href={`/search?q=${encodeURIComponent(tag)}`} style={{ padding: '4px 12px', background: 'var(--bg-hover)', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {tag}
              </Link>
            ))}
          </div>
        )}

        <div className="source-link" style={{ marginTop: '16px' }}>
          <span>来源：</span>
          <Link href={`https://jable.tv/videos/${id}/`} target="_blank" rel="noopener noreferrer">jable.tv</Link>
        </div>
      </div>

      <AdBanner slotId="video-infeed" />

      {/* 相关视频 */}
      <section style={{ marginTop: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>相关视频</h2>
        <div className="video-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Link key={i} href={`/videos/video-${i}`} className="video-item">
              <div className="video-thumb">
                <Image src={`https://picsum.photos/seed/related${i}/320/180`} alt={`相关视频 ${i}`} fill style={{ objectFit: 'cover' }} unoptimized />
                <span className="video-duration">08:30</span>
              </div>
              <div className="video-info">
                <h3 className="video-title">相关视频标题 {i}</h3>
                <div className="video-meta">
                  <span>500K 次观看</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
