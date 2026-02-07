import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <h1 className="error-title">页面未找到</h1>
      <p className="error-message">
       抱歉，您访问的页面不存在或已被移除。
      </p>
      <Link href="/" className="home-link">
        返回首页
      </Link>
    </div>
  );
}
