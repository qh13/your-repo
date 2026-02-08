import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '视频聚合平台',
  description: '聚合优质视频内容',
  openGraph: {
    title: '视频聚合平台',
    description: '聚合优质视频内容',
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
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="logo">视频聚合</Link>
            
            <nav className="nav">
              <Link href="/">首页</Link>
              <Link href="/category/recent">最新</Link>
              <Link href="/hot">热门</Link>
              <Link href="/search">搜索</Link>
              <Link href="/about">关于</Link>
            </nav>
          </div>
        </header>
        
        <main className="main container">
          {children}
        </main>
        
        <footer className="footer">
          <div className="container footer-inner">
            <div>
              <h4>关于我们</h4>
              <p>聚合优质视频内容</p>
            </div>
            <div>
              <h4>免责声明</h4>
              <p>内容来自第三方平台</p>
            </div>
          </div>
          <div className="container footer-bottom">
            <p>&copy; 2024 视频聚合平台</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
