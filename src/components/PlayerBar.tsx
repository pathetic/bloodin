import React, { useState, useEffect, useRef } from "react";
import { Song } from "../types";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { AudioPlayerAPI } from "../services/audioPlayerApi";
import {
  IconHeart,
  IconArrowsShuffle,
  IconPlayerTrackPrev,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerTrackNext,
  IconRepeat,
  IconRepeatOnce,
  IconVolume,
  IconVolume2,
  IconVolumeOff,
  IconMusic,
  IconPlaylist,
  IconMaximize,
  IconHistory,
} from "@tabler/icons-react";

interface PlayerBarProps {
  currentSong?: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";
  isSeeking?: boolean;
  isImageExpanded?: boolean;
  onImageExpand?: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onStartSeeking?: () => void;
  onStopSeeking?: () => void;
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  currentSong,
  isPlaying,
  progress,
  duration,
  volume,
  isShuffled,
  repeatMode,
  isSeeking = false,
  isImageExpanded = false,
  onImageExpand,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onShuffle,
  onRepeat,
  onStartSeeking,
  onStopSeeking,
}) => {
  const [localSeekPosition, setLocalSeekPosition] = useState(0);
  const [previousVolume, setPreviousVolume] = useState(0.7);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [isProgressHovered, setIsProgressHovered] = useState(false);
  const [previousClickTimeout, setPreviousClickTimeout] = useState<
    number | null
  >(null);
  const [isRecentSongsOpen, setIsRecentSongsOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recentSongsRef = useRef<HTMLDivElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const hasEndedRef = useRef<boolean>(false);

  const audioPlayerContext = useAudioPlayer();
  const recentlyPlayed = audioPlayerContext.getRecentlyPlayed();
  const lastPlayedSong = audioPlayerContext.getLastPlayedSong();

  // Check if text needs scrolling
  useEffect(() => {
    if (titleRef.current && containerRef.current && currentSong?.title) {
      const titleWidth = titleRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setShouldScroll(titleWidth > containerWidth);
    }
  }, [currentSong?.title]);

  // Close recent songs dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        recentSongsRef.current &&
        !recentSongsRef.current.contains(event.target as Node) &&
        historyButtonRef.current &&
        !historyButtonRef.current.contains(event.target as Node)
      ) {
        setIsRecentSongsOpen(false);
      }
    };

    if (isRecentSongsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isRecentSongsOpen]);

  // Reset hasEnded flag when song changes or when seeking
  useEffect(() => {
    hasEndedRef.current = false;
  }, [currentSong?.id, progress < duration - 1]);

  // Handle looping functionality
  useEffect(() => {
    if (!currentSong || !audioPlayerContext || hasEndedRef.current) return;

    const handleAudioEnd = async () => {
      hasEndedRef.current = true; // Prevent multiple triggers

      if (repeatMode === "one") {
        // Play the song again and set repeat mode to "none"
        console.log("🔁 Repeat once - Playing song again and disabling repeat");
        setTimeout(async () => {
          onSeek(0); // Reset to beginning
          // Use the audio player context to directly set repeat mode to "none"
          try {
            await AudioPlayerAPI.setRepeatMode("none");
          } catch (error) {
            console.error("Failed to set repeat mode to none:", error);
          }
          hasEndedRef.current = false; // Reset for next potential end
        }, 100);
      } else if (repeatMode === "all") {
        // Loop continuously - play the song again
        console.log("🔁 Repeat all - Looping song continuously");
        setTimeout(async () => {
          onSeek(0); // Reset to beginning
          // Ensure the song continues playing after seeking
          try {
            if (!isPlaying) {
              await audioPlayerContext.playPause(); // Resume if paused
            }
          } catch (error) {
            console.error("Failed to resume playback:", error);
          }
          hasEndedRef.current = false; // Reset for next loop
        }, 100);
      }
    };

    // Check if audio has ended (progress is very close to duration and is playing)
    if (
      isPlaying &&
      duration > 0 &&
      duration - progress < 0.5 &&
      progress > 1
    ) {
      handleAudioEnd();
    }
  }, [
    progress,
    duration,
    isPlaying,
    repeatMode,
    currentSong,
    onSeek,
    audioPlayerContext,
  ]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    setLocalSeekPosition(newProgress);

    if (!isSeeking && onStartSeeking) {
      onStartSeeking();
    }
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    // Set the initial seek position when starting to drag
    const newProgress = parseFloat((e.target as HTMLInputElement).value);
    setLocalSeekPosition(newProgress);

    if (onStartSeeking) {
      onStartSeeking();
    }
  };

  const handleProgressTouchStart = (e: React.TouchEvent<HTMLInputElement>) => {
    // Set the initial seek position when starting to drag
    const newProgress = parseFloat((e.target as HTMLInputElement).value);
    setLocalSeekPosition(newProgress);

    if (onStartSeeking) {
      onStartSeeking();
    }
  };

  const handleProgressMouseUp = () => {
    if (isSeeking) {
      onSeek(localSeekPosition);
      if (onStopSeeking) {
        onStopSeeking();
      }
    }
  };

  const handleProgressTouchEnd = () => {
    if (isSeeking) {
      onSeek(localSeekPosition);
      if (onStopSeeking) {
        onStopSeeking();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(newVolume);
  };

  const handleVolumeWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent page scrolling

    // Determine scroll direction and adjust volume
    const delta = e.deltaY;
    const volumeStep = 0.05; // 5% volume steps

    let newVolume: number;
    if (delta < 0) {
      // Scrolling up - increase volume
      newVolume = Math.min(1, volume + volumeStep);
    } else {
      // Scrolling down - decrease volume
      newVolume = Math.max(0, volume - volumeStep);
    }

    // Round to avoid floating point precision issues
    newVolume = Math.round(newVolume * 100) / 100;

    onVolumeChange(newVolume);
  };

  const handleMuteToggle = () => {
    if (volume === 0) {
      // Unmute: restore previous volume
      onVolumeChange(previousVolume);
    } else {
      // Mute: save current volume and set to 0
      setPreviousVolume(volume);
      onVolumeChange(0);
    }
  };

  const handlePreviousClick = () => {
    if (previousClickTimeout) {
      // Double click detected - clear timeout and handle double click
      clearTimeout(previousClickTimeout);
      setPreviousClickTimeout(null);

      // TODO: Implement previous track in queue when queue is available
      console.log(
        "🎵 Double click detected - Previous track (not implemented yet)"
      );
      // onPrevious(); // Will be uncommented when queue is implemented
    } else {
      // Single click - set timeout to wait for potential double click
      const timeout = setTimeout(() => {
        // Single click confirmed - restart song from beginning
        console.log("🎵 Single click - Restarting song from beginning");
        onSeek(0);
        setPreviousClickTimeout(null);
      }, 300); // 300ms delay to detect double click

      setPreviousClickTimeout(timeout);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (previousClickTimeout) {
        clearTimeout(previousClickTimeout);
      }
    };
  }, [previousClickTimeout]);

  const handleImageExpand = () => {
    if (onImageExpand) {
      onImageExpand();
    }
  };

  // Use current song if playing, otherwise show last played song
  const displaySong =
    currentSong || (lastPlayedSong ? lastPlayedSong.song : null);
  const isShowingLastPlayed = !currentSong && lastPlayedSong;

  if (!displaySong) {
    return (
      <div className="h-20 backdrop-blur-xl bg-black/30 border-t border-white/10 flex items-center justify-center">
        <p className="text-gray-400 text-sm">No song selected</p>
      </div>
    );
  }

  const handleRecentSongPlay = async (song: Song) => {
    try {
      await audioPlayerContext.playSong(song.id);
      setIsRecentSongsOpen(false);
    } catch (error) {
      console.error("Failed to play recent song:", error);
    }
  };

  return (
    <>
      {/* Recent Songs Context Menu */}
      {isRecentSongsOpen && recentlyPlayed.length > 0 && (
        <div className="fixed bottom-24 right-6 z-50">
          <div
            ref={recentSongsRef}
            className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-xl shadow-2xl w-80 max-h-72 overflow-hidden flex flex-col"
          >
            {/* Static Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-3 bg-black/20 backdrop-blur-sm">
              <h3 className="text-white font-medium flex items-center gap-2 text-sm">
                <IconHistory size={14} />
                Recent Songs
              </h3>
              <button
                onClick={() => setIsRecentSongsOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Songs List */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {recentlyPlayed.slice(0, 8).map((song, index) => (
                  <div
                    key={`${song.id}-${index}`}
                    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer group transition-colors ${
                      song.id === currentSong?.id
                        ? "bg-red-500/10 hover:bg-red-500/15"
                        : "hover:bg-white/10"
                    }`}
                    onClick={() => handleRecentSongPlay(song)}
                  >
                    <div className="w-8 h-8 flex-shrink-0">
                      {song.albumArt ? (
                        <img
                          src={song.albumArt}
                          alt={song.title}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-700 rounded flex items-center justify-center">
                          <IconMusic size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-medium truncate text-sm ${
                          song.id === currentSong?.id
                            ? "text-red-300"
                            : "text-white"
                        }`}
                      >
                        {song.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate">
                        {song.artist} • {song.album}
                      </p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all">
                      <IconPlayerPlay size={10} className="text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation for scrolling text */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll linear infinite;
        }
        
        /* Progress bar styling */
        .progress-slider {
          -webkit-appearance: none;
          appearance: none;
          transition: all 0.2s ease;
        }
        
        .progress-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .progress-slider:hover::-webkit-slider-thumb {
          opacity: 1;
          background: #ef4444;
        }
        
        .progress-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .progress-slider:hover::-moz-range-thumb {
          opacity: 1;
          background: #ef4444;
        }
      `}</style>

      <div className="h-20 backdrop-blur-xl bg-black/30 border-t border-white/10 flex items-center px-6 gap-6">
        {/* Left - Now Playing Info */}
        <div className="flex items-center min-w-0 w-80">
          {!isImageExpanded && (
            <div className="relative w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg mr-3 group">
              {displaySong.albumArt ? (
                <img
                  src={displaySong.albumArt}
                  alt={displaySong.album}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <IconMusic size={24} className="text-white" />
              )}
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
                className={`font-medium whitespace-nowrap ${
                  shouldScroll ? "animate-scroll" : "truncate"
                } ${isShowingLastPlayed ? "text-gray-300" : "text-white"}`}
                style={{
                  ...(shouldScroll && {
                    animationDuration: `${Math.max(
                      8,
                      displaySong.title.length * 0.2
                    )}s`,
                  }),
                }}
              >
                {displaySong.title}
                {shouldScroll && (
                  <span className="inline-block ml-8">{displaySong.title}</span>
                )}
              </h4>
            </div>
            <p
              className={`text-sm truncate ${
                isShowingLastPlayed ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {isShowingLastPlayed && "Last played: "}
              {displaySong.artist}
            </p>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer">
            <IconHeart size={16} />
          </button>
        </div>

        {/* Center - Player Controls */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-6 mb-1">
            <button
              onClick={onShuffle}
              className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                isShuffled
                  ? "bg-red-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <IconArrowsShuffle size={20} />
            </button>

            <button
              onClick={handlePreviousClick}
              className="p-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <IconPlayerTrackPrev size={24} />
            </button>

            <button
              onClick={
                isShowingLastPlayed
                  ? () => audioPlayerContext.playSong(displaySong.id)
                  : onPlayPause
              }
              className="w-11 h-11 bg-gradient-to-r from-red-500 to-red-700 rounded-full flex items-center justify-center hover:from-red-600 hover:to-red-800 transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer"
            >
              {isPlaying && !isShowingLastPlayed ? (
                <IconPlayerPause size={22} className="text-white" />
              ) : (
                <IconPlayerPlay size={22} className="text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              className="p-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <IconPlayerTrackNext size={24} />
            </button>

            <button
              onClick={onRepeat}
              className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                repeatMode !== "none"
                  ? "bg-red-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {repeatMode === "one" ? (
                <IconRepeatOnce size={20} />
              ) : (
                <IconRepeat size={20} />
              )}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-lg flex items-center space-x-3 mb-[0.5rem]">
            <span className="text-xs text-gray-400 w-10 text-right">
              {formatTime(isSeeking ? localSeekPosition : progress)}
            </span>
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max={duration}
                value={isSeeking ? localSeekPosition : progress}
                onChange={handleProgressChange}
                onMouseDown={handleProgressMouseDown}
                onMouseUp={handleProgressMouseUp}
                onTouchStart={handleProgressTouchStart}
                onTouchEnd={handleProgressTouchEnd}
                onMouseEnter={() => setIsProgressHovered(true)}
                onMouseLeave={() => setIsProgressHovered(false)}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer progress-slider mt-[0.1rem]"
                style={{
                  background: `linear-gradient(to right, ${
                    isProgressHovered ? "#ef4444" : "#ffffff"
                  } 0%, ${isProgressHovered ? "#dc2626" : "#ffffff"} ${
                    ((isSeeking ? localSeekPosition : progress) / duration) *
                    100
                  }%, #4b5563 ${
                    ((isSeeking ? localSeekPosition : progress) / duration) *
                    100
                  }%, #4b5563 100%)`,
                }}
              />
            </div>
            <span className="text-xs text-gray-400 w-10 text-left">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right - Volume and Extra Controls */}
        <div className="flex items-center justify-end w-80">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleMuteToggle}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {volume === 0 ? (
                <IconVolumeOff size={16} />
              ) : volume < 0.5 ? (
                <IconVolume2 size={16} />
              ) : (
                <IconVolume size={16} />
              )}
            </button>

            <div className="w-20 flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                onWheel={handleVolumeWheel}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #dc2626 ${
                    volume * 100
                  }%, #4b5563 ${volume * 100}%, #4b5563 100%)`,
                }}
              />
            </div>

            <button
              ref={historyButtonRef}
              onClick={() => setIsRecentSongsOpen(!isRecentSongsOpen)}
              className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
                recentlyPlayed.length === 0
                  ? "text-gray-600 cursor-not-allowed"
                  : isRecentSongsOpen
                  ? "text-white bg-white/20 hover:bg-white/30"
                  : "text-white hover:bg-white/10"
              }`}
              disabled={recentlyPlayed.length === 0}
              title={
                recentlyPlayed.length === 0
                  ? "No recent songs"
                  : isRecentSongsOpen
                  ? "Hide recent songs"
                  : "Show recent songs"
              }
            >
              <IconHistory size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerBar;
