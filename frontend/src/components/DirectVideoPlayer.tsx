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

// Dynamic import for hls.js to reduce main bundle size
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

    // 检查浏览器是否原生支持 HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 原生支持 HLS
      video.src = url;
      if (onLoaded) {
        video.addEventListener('loadedmetadata', onLoaded);
      }
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
            console.log(`Trying backup URL ${currentUrlIndexRef.current + 2}/${allUrls.length}`);
            const nextIndex = currentUrlIndexRef.current + 1;
            currentUrlIndexRef.current = nextIndex;
            setCurrentUrlIndex(nextIndex);
            loadVideo(allUrls[nextIndex]);
          } else {
            // 所有 URL 都尝试过了
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Network error, all URLs failed');
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Media error, all URLs failed');
                break;
              default:
                hls.destroy();
                break;
            }
          }
        }
      });

      hlsRef.current = hls;
    } else {
      // 不支持 HLS 的降级处理
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

  // 手动切换 URL（当播放失败时用户可以手动尝试）
  const handleRetry = useCallback(() => {
    if (currentUrlIndexRef.current < allUrls.length - 1) {
      const nextIndex = currentUrlIndexRef.current + 1;
      currentUrlIndexRef.current = nextIndex;
      setCurrentUrlIndex(nextIndex);
      loadVideo(allUrls[nextIndex]);
      setError(null);
    } else {
      // 重新尝试第一个 URL
      currentUrlIndexRef.current = 0;
      setCurrentUrlIndex(0);
      loadVideo(streamUrl);
      setError(null);
    }
  }, [allUrls, loadVideo, streamUrl]);

  if (error) {
    return (
      <div className="video-container video-error">
        <div className="error-overlay">
          <div className="error-content">
            <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={handleRetry}>
              尝试其他播放源 ({currentUrlIndex + 1}/{allUrls.length})
            </button>
          </div>
        </div>
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
            display: 'none',
          }}
        />
      </div>
    );
  }

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
