'use client';

import Link from 'next/link';
import Image from 'next/image';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    coverUrl: string;
    duration?: string;
    views?: string;
    author?: string;
  };
  priority?: boolean;
}

export default function VideoCard({ video, priority = false }: VideoCardProps) {
  return (
    <Link href={`/videos/${video.id}`} className="video-card">
      <div className="video-card-thumbnail">
        <Image
          src={video.coverUrl}
          alt={video.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          style={{ objectFit: 'cover' }}
          priority={priority}
          unoptimized={video.coverUrl.includes('jable.tv')}
        />
        {video.duration && (
          <span className="video-duration">{video.duration}</span>
        )}
      </div>
      <div className="video-card-info">
        <h3 className="video-card-title">{video.title}</h3>
        <div className="video-card-meta">
          {video.author && <span className="video-author">{video.author}</span>}
          {video.views && <span className="video-views">{video.views} 次观看</span>}
        </div>
      </div>
    </Link>
  );
}