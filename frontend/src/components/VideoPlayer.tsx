'use client';

import { useEffect, useRef, useState } from 'react';
import { getVideoM3u8Url } from '@/lib/api';

interface VideoPlayerProps {
  videoId: string;
  poster?: string;
  autoplay?: boolean;
  onError?: (error: Error) => void;
  onLoaded?: () => void;
}

let Hls: any;

export default function VideoPlayer({
  videoId,
  poster,
  autoplay = false,
  onError,
  onLoaded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [hlsLoaded, setHlsLoaded] = useState(false);

  useEffect(() => {
    import('hls.js').then((module) => {
      Hls = module.default;
      setHlsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!hlsLoaded || !videoRef.current) return;

    const video = videoRef.current;
    const videoSrc = getVideoM3u8Url(videoId);

    // Safari 原生支持 HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
      onLoaded?.();
      return;
    }

    if (Hls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(videoSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onLoaded?.();
        if (autoplay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          onError?.(new Error(data.details));
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }

    onError?.(new Error('Browser does not support HLS'));
  }, [videoId, autoplay, onError, onLoaded, hlsLoaded]);

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        controls
        poster={poster}
        playsInline
        preload="metadata"
        style={{
          width: '100%',
          maxWidth: '100%',
          backgroundColor: '#000',
        }}
      />
    </div>
  );
}
