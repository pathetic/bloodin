import React, { useState, useEffect, useRef } from "react";
import { Song } from "../../types";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import { AudioPlayerAPI } from "../../services/audioPlayerApi";
import NowPlayingInfo from "./NowPlayingInfo";
import PlayerControls from "./PlayerControls";
import ProgressBar from "./ProgressBar";
import VolumeControls from "./VolumeControls";
import RecentSongsPanel from "./RecentSongsPanel";
import QueuePanel from "./QueuePanel";

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
  onFullscreen?: () => void;
  onArtistClick?: (artistId: string, artistName: string) => void;
  onSourceNavigate?: () => void;
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
  onFullscreen,
  onArtistClick,
  onSourceNavigate,
}) => {
  const [isRecentSongsOpen, setIsRecentSongsOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const recentSongsRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const queueButtonRef = useRef<HTMLButtonElement>(null);
  const hasEndedRef = useRef<boolean>(false);

  const audioPlayerContext = useAudioPlayer();
  const lastPlayedSong = audioPlayerContext.getLastPlayedSong();

  // Force re-render when queue changes
  const queueVersion = audioPlayerContext.queueVersion;

  // Use current song if playing, otherwise show last played song
  const displaySong =
    currentSong || (lastPlayedSong ? lastPlayedSong.song : null);

  // Close panels when clicking outside
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

      if (
        queueRef.current &&
        !queueRef.current.contains(event.target as Node) &&
        queueButtonRef.current &&
        !queueButtonRef.current.contains(event.target as Node)
      ) {
        setIsQueueOpen(false);
      }
    };

    if (isRecentSongsOpen || isQueueOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isRecentSongsOpen, isQueueOpen]);

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

  if (!displaySong) {
    return (
      <div className="h-20 backdrop-blur-xl bg-black/30 border-t border-white/10 flex items-center justify-center">
        <p className="text-gray-400 text-sm">No song selected</p>
      </div>
    );
  }

  return (
    <>
      {/* Recent Songs Panel */}
      <RecentSongsPanel
        currentSong={currentSong}
        isOpen={isRecentSongsOpen}
        onClose={() => setIsRecentSongsOpen(false)}
        recentSongsRef={recentSongsRef}
        onArtistClick={onArtistClick}
      />

      {/* Queue Panel */}
      <QueuePanel
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queueRef={queueRef}
        onArtistClick={onArtistClick}
      />

      {/* CSS Animation for scrolling text and progress bar styling */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-50%);
          }
          50.01% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
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
        <NowPlayingInfo
          currentSong={currentSong}
          isImageExpanded={isImageExpanded}
          onImageExpand={onImageExpand}
          onArtistClick={onArtistClick}
          onSourceNavigate={onSourceNavigate}
        />

        {/* Center - Player Controls */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Control Buttons */}
          <PlayerControls
            currentSong={currentSong}
            isPlaying={isPlaying}
            isShuffled={isShuffled}
            repeatMode={repeatMode}
            onPlayPause={onPlayPause}
            onNext={onNext}
            onPrevious={onPrevious}
            onShuffle={onShuffle}
            onRepeat={onRepeat}
          />

          {/* Progress Bar */}
          <ProgressBar
            progress={progress}
            duration={duration}
            isSeeking={isSeeking}
            onSeek={onSeek}
            onStartSeeking={onStartSeeking}
            onStopSeeking={onStopSeeking}
          />
        </div>

        {/* Right - Volume and Extra Controls */}
        <VolumeControls
          volume={volume}
          onVolumeChange={onVolumeChange}
          onFullscreen={onFullscreen}
          isRecentSongsOpen={isRecentSongsOpen}
          setIsRecentSongsOpen={setIsRecentSongsOpen}
          isQueueOpen={isQueueOpen}
          setIsQueueOpen={setIsQueueOpen}
          historyButtonRef={historyButtonRef}
          queueButtonRef={queueButtonRef}
        />
      </div>
    </>
  );
};

export default PlayerBar;
