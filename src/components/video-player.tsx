"use client";

import { useState } from "react";
import { Play } from "lucide-react";

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  }

  return null;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

interface VideoPlayerProps {
  url: string;
  thumbnail?: string | null;
  className?: string;
}

export function VideoPlayer({ url, thumbnail, className = "" }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const youtubeEmbed = getYouTubeEmbedUrl(url);

  if (thumbnail && !playing) {
    return (
      <div
        className={`aspect-video bg-black rounded-lg overflow-hidden relative group cursor-pointer ${className}`}
        onClick={() => setPlaying(true)}
      >
        <img
          src={thumbnail}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Play className="h-7 w-7 text-gray-900 ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
    );
  }

  if (youtubeEmbed) {
    return (
      <div className={`aspect-video bg-black rounded-lg overflow-hidden ${className}`}>
        <iframe
          src={youtubeEmbed}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  if (isDirectVideoUrl(url) || true) {
    return (
      <div className={`aspect-video bg-black rounded-lg overflow-hidden ${className}`}>
        <video
          src={url}
          controls
          autoPlay={playing}
          className="w-full h-full"
          controlsList="nodownload"
        />
      </div>
    );
  }
}
