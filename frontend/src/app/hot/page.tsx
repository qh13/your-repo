import dynamic from 'next/dynamic';

const AdBanner = dynamic(() => import('@/components/AdBanner'));
const VideoGrid = dynamic(() => import('@/components/VideoGrid'));

export default function HotPage() {
  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>🔥 热门视频</h1>
      
      <AdBanner slotId="hot-top" />
      
      <VideoGrid category="hot" showPagination={true} />
    </div>
  );
}
