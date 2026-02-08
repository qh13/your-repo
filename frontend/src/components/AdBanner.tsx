'use client';

interface AdBannerProps {
  slotId: string;
  className?: string;
}

export default function AdBanner({ slotId, className = '' }: AdBannerProps) {
  return (
    <div className={`ad-placeholder ${className}`}>
      <span>广告位: {slotId}</span>
    </div>
  );
}
