import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ℹ️ 关于我们 - 视频聚合平台',
  description: '了解视频聚合平台的功能和特点',
};

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* 英雄区域 */}
      <section className="hero-section" style={{ flexDirection: 'column', textAlign: 'center' }}>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-gradient">ℹ️ 关于我们</span>
          </h1>
          <p className="hero-subtitle">
            了解我们的使命和价值
          </p>
        </div>
      </section>
      
      <div className="page-container">
        <section className="about-section">
          <h2>🎯 平台介绍</h2>
          <p>
            视频聚合平台致力于为用户提供便捷的视频发现和浏览服务。
            我们聚合来自各平台的精彩视频内容，让用户能够在一个平台上欣赏到多样化的视频资源。
          </p>
        </section>
        
        <section className="about-section">
          <h2>✨ 我们的特点</h2>
          <ul>
            <li>🔍 强大的搜索功能，快速找到感兴趣的视频</li>
            <li>📂 完善的分类系统，按类别浏览视频</li>
            <li>🔥 热门推荐，发现最受欢迎的内容</li>
            <li>📱 响应式设计，支持各种设备访问</li>
          </ul>
        </section>
        
        <section className="about-section">
          <h2>📡 内容来源</h2>
          <p>
            我们的视频内容均来自第三方公开平台，仅供学习和交流使用。
            我们的目标是帮助用户更方便地发现和欣赏优质的视频内容。
          </p>
        </section>
        
        <section className="about-section">
          <h2>⚖️ 免责声明</h2>
          <p>
            本站内容均来自第三方公开平台，仅供学习交流使用。
            我们不对第三方平台的内容负责，如有侵权，请联系我们处理。
          </p>
        </section>
        
        <section className="about-section contact-section">
          <h2>📬 联系我们</h2>
          <p>
            如有任何问题或建议，请联系我们：
          </p>
          <p className="contact-email">
            📧 邮箱：contact@example.com
          </p>
        </section>
      </div>
    </div>
  );
}
