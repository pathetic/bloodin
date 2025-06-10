import React, { useState, useEffect, useRef } from "react";
import { Song } from "../../types";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import { IconHeart, IconMusic, IconMaximize } from "@tabler/icons-react";
import ClickableArtists from "./ClickableArtists";

interface NowPlayingInfoProps {
  currentSong?: Song;
  isImageExpanded?: boolean;
  onImageExpand?: () => void;
  onArtistClick?: (artistId: string, artistName: string) => void;
  onSourceNavigate?: () => void;
}

const NowPlayingInfo: React.FC<NowPlayingInfoProps> = ({
  currentSong,
  isImageExpanded = false,
  onImageExpand,
  onArtistClick,
  onSourceNavigate,
}) => {
  const [shouldScroll, setShouldScroll] = useState(false);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const audioPlayerContext = useAudioPlayer();
  const lastPlayedSong = audioPlayerContext.getLastPlayedSong();

  // Use current song if playing, otherwise show last played song
  const displaySong =
    currentSong || (lastPlayedSong ? lastPlayedSong.song : null);
  const isShowingLastPlayed = !currentSong && lastPlayedSong;

  // Check if text needs scrolling
  useEffect(() => {
    if (titleRef.current && containerRef.current && displaySong?.title) {
      const titleWidth = titleRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      const titleLength = displaySong.title.length;

      // Enable scrolling if title is long enough OR doesn't fit in container
      // Minimum 15 characters or if text overflows
      setShouldScroll(titleLength > 15 || titleWidth > containerWidth + 10);
    }
  }, [displaySong?.title]);

  const handleImageExpand = () => {
    if (onImageExpand) {
      onImageExpand();
    }
  };

  if (!displaySong) {
    return (
      <div className="flex items-center min-w-0 w-80">
        <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg mr-3">
          <IconMusic size={24} className="text-base-content/60" />
        </div>
        <div className="min-w-0 flex-1 mr-3">
          <h4 className="font-medium text-base-content/60">No song selected</h4>
          <p className="text-sm text-base-content/50">Select a song to play</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center min-w-0 w-80">
      {!isImageExpanded && (
        <div className="relative w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg mr-3 group">
          {/* Main album art - clickable for source navigation */}
          <div
            onClick={onSourceNavigate}
            className={`w-full h-full rounded-lg flex items-center justify-center ${
              onSourceNavigate
                ? "cursor-pointer hover:opacity-80 transition-opacity"
                : ""
            }`}
            title={onSourceNavigate ? "Go to source" : undefined}
          >
            {displaySong.albumArt ? (
              <img
                src={displaySong.albumArt}
                alt={displaySong.album}
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              <IconMusic size={24} className="text-white" />
            )}
          </div>

          {/* Expand button overlay */}
          <button
            onClick={handleImageExpand}
            className="absolute -top-1 -right-1 w-5 h-5 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/90 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <IconMaximize size={12} className="text-white" />
          </button>
        </div>
      )}
      <div className="min-w-0 flex-1 mr-3" ref={containerRef}>
        <div className="relative overflow-hidden">
          <h4
            ref={titleRef}
            className={`font-medium whitespace-nowrap transition-all duration-300 ${
              shouldScroll && isTitleHovered ? "animate-scroll" : "truncate"
            } ${
              isShowingLastPlayed
                ? "text-base-content/70"
                : "text-base-content/100"
            }`}
            style={{
              ...(shouldScroll &&
                isTitleHovered && {
                  animationDuration: `${Math.max(
                    8,
                    displaySong.title.length * 0.12
                  )}s`,
                }),
            }}
            onMouseEnter={() => setIsTitleHovered(true)}
            onMouseLeave={() => setIsTitleHovered(false)}
          >
            {displaySong.title}
            {shouldScroll && isTitleHovered && (
              <span className="inline-block ml-12">{displaySong.title}</span>
            )}
          </h4>
        </div>
        <p
          className={`text-sm truncate ${
            isShowingLastPlayed
              ? "text-base-content/50"
              : "text-base-content/60"
          }`}
        >
          <ClickableArtists
            artistString={displaySong.artist}
            artistIds={displaySong.artistIds}
            onArtistClick={onArtistClick}
          />
        </p>
      </div>
      <button className="p-1.5 rounded-lg hover:bg-white/10 text-base-content/60 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer">
        <IconHeart size={16} />
      </button>
    </div>
  );
};

export default NowPlayingInfo;
