'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slotId: string;
  format?: 'banner' | 'rectangle' | 'horizontal';
  className?: string;
}

export default function AdBanner({
  slotId,
  format = 'banner',
  className = '',
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Monetag 广告加载逻辑
    // 实际部署时需要在 Monetag 后台获取广告代码并替换
    if (adRef.current) {
      adRef.current.innerHTML = `
        <div style="
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 30px 20px;
          text-align: center;
          color: rgba(255,255,255,0.6);
          min-height: ${format === 'banner' ? '80px' : format === 'rectangle' ? '280px' : '120px'};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
            animation: shimmer 3s infinite;
          "></div>
          <div>
            <p style="margin: 0 0 10px; font-weight: 600; font-size: 14px; color: rgba(255,255,255,0.8);">📢 广告位 ${slotId}</p>
            <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.5);">Monetag 广告</p>
            <p style="margin: 12px 0 0; font-size: 12px; color: rgba(255,255,255,0.4);">部署后替换为实际广告代码</p>
          </div>
        </div>
        <style>
          @keyframes shimmer {
            100% { left: 100%; }
          }
        </style>
      `;
    }
  }, [slotId, format]);

  const heightMap = {
    banner: '100px',
    rectangle: '320px',
    horizontal: '160px',
  };

  return (
    <div
      ref={adRef}
      className={`ad-banner ad-${format} ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '20px 0',
        minHeight: heightMap[format],
      }}
    />
  );
}

// 页面顶部大横幅广告
export function TopBannerAd() {
  return (
    <AdBanner
      slotId="top-banner"
      format="banner"
      className="top-ad"
    />
  );
}

// 侧边栏广告
export function SidebarAd() {
  return (
    <AdBanner
      slotId="sidebar"
      format="rectangle"
      className="sidebar-ad"
    />
  );
}

// 视频间广告
export function InFeedAd() {
  return (
    <AdBanner
      slotId="in-feed"
      format="horizontal"
      className="infeed-ad"
    />
  );
}
