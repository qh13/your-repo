import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于我们 - 视频聚合平台',
  description: '了解视频聚合平台',
};

export default function AboutPage() {
  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>关于我们</h1>
      
      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>平台介绍</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          视频聚合平台致力于为用户提供便捷的视频发现和浏览服务。
          我们聚合来自各平台的精彩视频内容，让用户能够在一个平台上欣赏到多样化的视频资源。
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>内容来源</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          我们的视频内容均来自第三方公开平台，仅供学习和交流使用。
          我们的目标是帮助用户更方便地发现和欣赏优质的视频内容。
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>免责声明</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          本站内容均来自第三方公开平台，仅供学习交流使用。
          我们不对第三方平台的内容负责，如有侵权，请联系我们处理。
        </p>
      </div>
    </div>
  );
}
