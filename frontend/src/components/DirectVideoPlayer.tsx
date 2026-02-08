'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface VideoStreamInfo {
  videoId: string;
  streamUrl: string;
  backupUrls?: string[];
  poster?: string;
  autoplay?: boolean;
  onError?: (error: Error) => void;
  onLoaded?: () => void;
}

let Hls: any;

export default function DirectVideoPlayer({
  videoId,
  streamUrl,
  backupUrls = [],
  poster,
  autoplay = false,
  onError,
  onLoaded,
}: VideoStreamInfo) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const currentUrlIndexRef = useRef(0);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hlsLoaded, setHlsLoaded] = useState(false);

  const allUrls = [streamUrl, ...backupUrls];

  // Dynamic import hls.js
  useEffect(() => {
    import('hls.js').then((module) => {
      Hls = module.default;
      setHlsLoaded(true);
    });
  }, []);

  const loadVideo = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video) return;

    // 销毁之前的 Hls 实例
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Safari 原生支持 HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      onLoaded?.();
      return;
    }

    // 使用 hls.js
    if (hlsLoaded && Hls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onLoaded?.();
        if (autoplay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        console.error('HLS error:', data);
        setError(`加载错误: ${data.details}`);

        if (data.fatal) {
          onError?.(new Error(data.details));

          // 尝试切换到备用 URL
          if (currentUrlIndexRef.current < allUrls.length - 1) {
            const nextIndex = currentUrlIndexRef.current + 1;
            currentUrlIndexRef.current = nextIndex;
            setCurrentUrlIndex(nextIndex);
            loadVideo(allUrls[nextIndex]);
          }
        }
      });

      hlsRef.current = hls;
    } else {
      const err = new Error('Browser does not support HLS');
      onError?.(err);
      setError(err.message);
    }
  }, [autoplay, hlsLoaded, onError, onLoaded]);

  useEffect(() => {
    if (streamUrl && hlsLoaded) {
      currentUrlIndexRef.current = 0;
      setCurrentUrlIndex(0);
      setError(null);
      loadVideo(streamUrl);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, autoplay, onError, onLoaded, hlsLoaded, loadVideo]);

  const handleRetry = useCallback(() => {
    if (currentUrlIndexRef.current < allUrls.length - 1) {
      const nextIndex = currentUrlIndexRef.current + 1;
      currentUrlIndexRef.current = nextIndex;
      setCurrentUrlIndex(nextIndex);
      loadVideo(allUrls[nextIndex]);
      setError(null);
    } else {
      currentUrlIndexRef.current = 0;
      setCurrentUrlIndex(0);
      loadVideo(streamUrl);
      setError(null);
    }
  }, [allUrls, loadVideo, streamUrl]);

  if (error) {
    return (
      <div className="player-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: '#ff6b6b' }}>{error}</p>
        <button onClick={handleRetry} className="search-btn">
          切换播放源 ({currentUrlIndex + 1}/{allUrls.length})
        </button>
        <video
          ref={videoRef}
          controls
          poster={poster}
          playsInline
          preload="metadata"
          style={{ width: '100%', display: 'none' }}
        />
      </div>
    );
  }

  return (
    <div className="player-wrapper">
      <video
        ref={videoRef}
        controls
        poster={poster}
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
