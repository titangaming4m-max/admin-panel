import React, { useRef, useState, useEffect } from 'react';
import { getVideo } from '../lib/videoStorage';

interface PlanVideoPlayerProps {
  videoUrl?: string;
  videoFileSize?: string;
  videoFileName?: string;
  videoFrameRate?: string;
}

const GUARANTEED_FALLBACK_VIDEO = 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4';

export default function PlanVideoPlayer({ videoUrl, videoFileSize, videoFileName, videoFrameRate }: PlanVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Unmuted by default so sound is enabled on click
  const [isHovered, setIsHovered] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>('');
  const [hasTriedFallback, setHasTriedFallback] = useState(false);

  // Helper to parse YouTube and Vimeo URLs
  const getEmbedInfo = (url: string) => {
    if (!url) return { type: 'unsupported', embedUrl: '' };

    // YouTube RegExp
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&mute=0&loop=1&playlist=${ytMatch[1]}&controls=1&showinfo=0&rel=0`
      };
    }

    // Vimeo RegExp
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=0&muted=0&loop=1&autopause=0`
      };
    }

    return { type: 'direct', embedUrl: url };
  };

  const { type, embedUrl } = getEmbedInfo(activeVideoUrl);

  // Load video URL, retrieving from IndexedDB if it was a persistent upload
  useEffect(() => {
    let activeUrl = videoUrl || '';
    let isMounted = true;
    let localBlobUrl = '';

    const loadVideo = async () => {
      if (activeUrl.startsWith('video-file-')) {
        const storedFile = await getVideo(activeUrl);
        if (storedFile && isMounted) {
          localBlobUrl = URL.createObjectURL(storedFile);
          setActiveVideoUrl(localBlobUrl);
        } else if (isMounted) {
          // Fallback to demo video if not found
          setActiveVideoUrl(GUARANTEED_FALLBACK_VIDEO);
        }
      } else {
        if (isMounted) {
          setActiveVideoUrl(activeUrl);
        }
      }
      if (isMounted) {
        setHasTriedFallback(false);
      }
    };

    loadVideo();

    return () => {
      isMounted = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [videoUrl]);

  // Keep the DOM element's muted state in sync with React state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle source changes correctly by calling .load() on the video element
  useEffect(() => {
    if (videoRef.current && activeVideoUrl) {
      try {
        videoRef.current.load();
      } catch (err) {
        console.warn('Error loading video source:', err);
      }
    }
  }, [activeVideoUrl]);

  // Synchronize play state using HTML5 native video events so React state never drifts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('playing', handlePlay);

    // Initial sync
    setIsPlaying(!video.paused);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('playing', handlePlay);
    };
  }, [activeVideoUrl]);

  // Help detect source/format compatibility errors (e.g., when dummy/mock files are uploaded)
  const isSourceError = (err: any) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    const name = err.name || '';
    return name === 'NotSupportedError' || msg.includes('supported') || msg.includes('format') || msg.includes('source') || msg.includes('decode');
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type !== 'direct' || !videoRef.current) return;

    const video = videoRef.current;
    if (video.paused) {
      // If user manually plays, let's keep their current mute setting, or unmute if muted to ensure they hear it
      if (isMuted) {
        video.muted = false;
        setIsMuted(false);
      }
      video.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          if (isSourceError(err)) {
            console.warn('Manual play failed due to unsupported format, falling back...', err);
            handleVideoError();
          } else {
            console.error('Explicit play failed:', err);
          }
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type !== 'direct' || !videoRef.current) return;

    const video = videoRef.current;
    const newMute = !video.muted;
    video.muted = newMute;
    setIsMuted(newMute);
  };

  const handleVideoError = () => {
    console.warn('Video element reported error. Automatically switching to streamable demo video.');
    if (!hasTriedFallback) {
      setHasTriedFallback(true);
      setActiveVideoUrl(GUARANTEED_FALLBACK_VIDEO);
    }
  };

  if (!videoUrl || !activeVideoUrl) {
    return null;
  }

  return (
    <div 
      className="relative w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-950 aspect-video shadow-inner group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {type === 'youtube' || type === 'vimeo' ? (
        <iframe
          src={embedUrl}
          className="w-full h-full border-none"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={videoFileName || 'Service Plan Video'}
        ></iframe>
      ) : (
        <>
          <video
            ref={videoRef}
            src={activeVideoUrl}
            loop
            preload="auto"
            muted={isMuted}
            playsInline
            controls={false}
            className="w-full h-full object-cover cursor-pointer"
            onClick={handlePlayPause}
            onError={handleVideoError}
          />

          {/* Centered Big Play Button when Paused */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-all duration-300"
              onClick={handlePlayPause}
            >
              <button 
                type="button"
                className="w-14 h-14 rounded-full bg-indigo-500/90 hover:bg-indigo-600 hover:scale-110 text-white flex items-center justify-center shadow-lg transition-all transform duration-200 active:scale-95 cursor-pointer"
              >
                <i className="fa-solid fa-play text-xl ml-1"></i>
              </button>
            </div>
          )}

          {/* Bottom Control Strip - Always fully interactive so the user can easily toggle sound and play/pause */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 flex items-center justify-between transition-all duration-300 opacity-100 z-10">
            <div className="flex items-center gap-2.5">
              <button 
                type="button"
                onClick={handlePlayPause}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              >
                <i className={`fa-solid ${isPlaying ? 'fa-pause text-xs' : 'fa-play text-xs ml-0.5'}`}></i>
              </button>
              
              <button 
                type="button"
                onClick={handleToggleMute}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <i className={`fa-solid ${isMuted ? 'fa-volume-xmark text-xs' : 'fa-volume-high text-xs'}`}></i>
              </button>
            </div>

            {videoFileName && (
              <span className="text-white/80 font-semibold text-[10px] truncate max-w-[150px] uppercase tracking-wider">
                {videoFileName}
              </span>
            )}
          </div>
        </>
      )}

      {/* Playing / Size Badge */}
      <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md text-[9px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 pointer-events-none select-none z-10">
        <span className={`w-1.5 h-1.5 rounded-full bg-[#22c55e] ${isPlaying ? 'animate-ping' : ''}`}></span>
        <span>{isPlaying ? 'Playing Demo' : 'Paused'}</span>
        {videoFileSize && (
          <span className="text-slate-300 font-bold">({videoFileSize}{videoFrameRate ? ` @ ${videoFrameRate}` : ''})</span>
        )}
        {!videoFileSize && videoFrameRate && (
          <span className="text-slate-300 font-bold">({videoFrameRate})</span>
        )}
      </div>

      {/* High-fidelity Frame Rate Badge on top-right */}
      {videoFrameRate && (
        <div className="absolute top-2.5 right-2.5 bg-indigo-600/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-[9px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1 pointer-events-none select-none z-10 shadow-md border border-indigo-400/30">
          <i className="fa-solid fa-bolt text-amber-300 animate-pulse text-[8px]"></i>
          <span>{videoFrameRate}</span>
        </div>
      )}
    </div>
  );
}
