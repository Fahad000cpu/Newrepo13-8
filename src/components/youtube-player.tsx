// src/components/youtube-player.tsx
"use client";

interface YoutubePlayerProps {
  videoId: string;
}

export function YoutubePlayer({ videoId }: YoutubePlayerProps) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

    return (
        <div className="aspect-video w-full max-w-full rounded-lg overflow-hidden h-full">
            <iframe
                src={embedUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
            ></iframe>
        </div>
    );
}
