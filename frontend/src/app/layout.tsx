import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '🔥 视频聚合平台 - 发现精彩',
  description: '聚合来自各平台的精彩视频内容，提供极致的浏览体验',
  keywords: ['视频', '聚合', '在线观看', '短视频', '娱乐'],
  openGraph: {
    title: '视频聚合平台 - 发现精彩',
    description: '聚合来自各平台的精彩视频内容',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* 背景光效 */}
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
        <div className="bg-glow bg-glow-3" />
        
        {/* 网格背景 */}
        <div className="grid-bg" />
        
        <header className="site-header">
          <div className="header-container">
            <Link href="/" className="logo">
              <span className="logo-icon">▶</span>
              <span className="logo-text">视频聚合</span>
              <span className="logo-badge">PRO</span>
            </Link>
            
            <nav className="main-nav">
              <Link href="/">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>首页</span>
              </Link>
              <Link href="/category/recent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>最新</span>
              </Link>
              <Link href="/hot">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>热门</span>
              </Link>
              <Link href="/search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>搜索</span>
              </Link>
              <Link href="/about">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>关于</span>
              </Link>
            </nav>
            
            <div className="header-actions">
              <div className="source-notice">
                <span className="pulse-dot" />
                内容实时聚合
              </div>
            </div>
          </div>
        </header>
        
        <main className="main-content">
          {children}
        </main>
        
        <footer className="site-footer">
          <div className="footer-container">
            <div className="footer-section">
              <h4>关于我们</h4>
              <p>视频聚合平台致力于为用户提供便捷的视频发现和浏览服务。</p>
            </div>
            <div className="footer-section">
              <h4>免责声明</h4>
              <p>本站内容均来自第三方公开平台，仅供学习交流使用。</p>
              <p>如有侵权，请联系我们处理。</p>
            </div>
            <div className="footer-section">
              <h4>联系我们</h4>
              <p>邮箱：contact@example.com</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 视频聚合平台. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
