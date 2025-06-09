import React, { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Song } from "../types";
import {
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
  IconX,
} from "@tabler/icons-react";

interface FullscreenPlayerProps {
  currentSong?: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";
  isSeeking?: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onStartSeeking?: () => void;
  onStopSeeking?: () => void;
  onExit: () => void;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  velocity: { x: number; y: number };
  color: string;
}

const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({
  currentSong,
  isPlaying,
  progress,
  duration,
  volume,
  isShuffled,
  repeatMode,
  isSeeking = false,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onShuffle,
  onRepeat,
  onStartSeeking,
  onStopSeeking,
  onExit,
}) => {
  const [localSeekPosition, setLocalSeekPosition] = useState(0);
  const [previousVolume, setPreviousVolume] = useState(0.7);
  const [isProgressHovered, setIsProgressHovered] = useState(false);
  const [showExitButton, setShowExitButton] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [albumColors, setAlbumColors] = useState({
    primary: "#ef4444",
    secondary: "#dc2626",
    accent: "#fca5a5",
  });
  const [isMouseHidden, setIsMouseHidden] = useState(false);
  const [areControlsHidden, setAreControlsHidden] = useState(false);

  const exitTimeoutRef = useRef<number | null>(null);
  const bubbleIdRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const mouseHideTimeoutRef = useRef<number | null>(null);

  // Enter fullscreen mode when component mounts
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        const window = getCurrentWindow();
        await window.setFullscreen(true);
        console.log("🚀 Entered native fullscreen mode");
      } catch (error) {
        console.error("Failed to enter fullscreen:", error);
      }
    };

    enterFullscreen();

    // Exit fullscreen when component unmounts
    return () => {
      const exitFullscreen = async () => {
        try {
          const window = getCurrentWindow();
          await window.setFullscreen(false);
          console.log("🚀 Exited native fullscreen mode");
        } catch (error) {
          console.error("Failed to exit fullscreen:", error);
        }
      };

      exitFullscreen();
    };
  }, []);

  // Extract colors from album art
  useEffect(() => {
    if (currentSong?.albumArt) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Sample colors from different areas of the image
        const colors = [];
        for (let i = 0; i < 5; i++) {
          const x = Math.floor(Math.random() * img.width);
          const y = Math.floor(Math.random() * img.height);
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          colors.push(`rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
        }

        // Use most vibrant colors
        setAlbumColors({
          primary: colors[0] || "#ef4444",
          secondary: colors[1] || "#dc2626",
          accent: colors[2] || "#fca5a5",
        });
      };
      img.src = currentSong.albumArt;
    }
  }, [currentSong?.albumArt]);

  // Initialize bubbles
  useEffect(() => {
    const initialBubbles: Bubble[] = [];
    for (let i = 0; i < 20; i++) {
      initialBubbles.push({
        id: bubbleIdRef.current++,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 80 + 20,
        opacity: Math.random() * 0.3 + 0.1,
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
        },
        color: [albumColors.primary, albumColors.secondary, albumColors.accent][
          Math.floor(Math.random() * 3)
        ],
      });
    }
    setBubbles(initialBubbles);
  }, [albumColors]);

  // Animate bubbles
  useEffect(() => {
    const animateBubbles = () => {
      setBubbles((prev) =>
        prev.map((bubble) => {
          let newX = bubble.x + bubble.velocity.x;
          let newY = bubble.y + bubble.velocity.y;
          let newVelocityX = bubble.velocity.x;
          let newVelocityY = bubble.velocity.y;

          // Bounce off edges
          if (newX <= 0 || newX >= window.innerWidth - bubble.size) {
            newVelocityX = -newVelocityX;
            newX = Math.max(0, Math.min(window.innerWidth - bubble.size, newX));
          }
          if (newY <= 0 || newY >= window.innerHeight - bubble.size) {
            newVelocityY = -newVelocityY;
            newY = Math.max(
              0,
              Math.min(window.innerHeight - bubble.size, newY)
            );
          }

          return {
            ...bubble,
            x: newX,
            y: newY,
            velocity: { x: newVelocityX, y: newVelocityY },
          };
        })
      );

      animationFrameRef.current = requestAnimationFrame(animateBubbles);
    };

    animationFrameRef.current = requestAnimationFrame(animateBubbles);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle mouse movement for exit button with improved animation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const isAtTop = e.clientY < 80; // Trigger zone increased to 80px

      // Show mouse and controls when moving
      setIsMouseHidden(false);
      setAreControlsHidden(false);

      // Clear existing mouse hide timeout
      if (mouseHideTimeoutRef.current) {
        clearTimeout(mouseHideTimeoutRef.current);
      }

      // Set new timeout to hide mouse and controls after 5 seconds
      mouseHideTimeoutRef.current = window.setTimeout(() => {
        setIsMouseHidden(true);
        setAreControlsHidden(true);
      }, 5000);

      // Handle exit button visibility
      if (isAtTop) {
        setShowExitButton(true);
        // Clear any existing timeout
        if (exitTimeoutRef.current) {
          clearTimeout(exitTimeoutRef.current);
        }
        // Set timeout to hide button after 3 seconds of no movement at top
        exitTimeoutRef.current = window.setTimeout(() => {
          setShowExitButton(false);
        }, 3000);
      } else if (!isAtTop && showExitButton) {
        // Hide immediately when moving away from top
        if (exitTimeoutRef.current) {
          clearTimeout(exitTimeoutRef.current);
        }
        exitTimeoutRef.current = window.setTimeout(() => {
          setShowExitButton(false);
        }, 500); // Small delay to prevent flickering
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Set initial timeout for hiding mouse and controls
    mouseHideTimeoutRef.current = window.setTimeout(() => {
      setIsMouseHidden(true);
      setAreControlsHidden(true);
    }, 5000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
      if (mouseHideTimeoutRef.current) {
        clearTimeout(mouseHideTimeoutRef.current);
      }
    };
  }, [showExitButton]);

  // Handle ESC key and exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleExit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleExit = async () => {
    try {
      const window = getCurrentWindow();
      await window.setFullscreen(false);
      onExit();
    } catch (error) {
      console.error("Failed to exit fullscreen:", error);
      onExit(); // Fallback
    }
  };

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

  const handleProgressMouseUp = () => {
    onSeek(localSeekPosition);
    if (onStopSeeking) {
      onStopSeeking();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  const handleMuteToggle = () => {
    if (volume === 0) {
      onVolumeChange(previousVolume);
    } else {
      setPreviousVolume(volume);
      onVolumeChange(0);
    }
  };

  if (!currentSong) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black overflow-hidden ${
        isMouseHidden ? "cursor-none" : ""
      }`}
    >
      {/* Animated Bubbles Background */}
      <div className="absolute inset-0 overflow-hidden">
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute rounded-full blur-sm animate-pulse"
            style={{
              left: `${bubble.x}px`,
              top: `${bubble.y}px`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              backgroundColor: bubble.color,
              opacity: bubble.opacity,
            }}
          />
        ))}
      </div>

      {/* Exit Button with smooth slide-down animation */}
      <div className="absolute top-0 left-0 right-0 h-20 flex justify-end items-start p-6 z-50">
        <div
          className={`transform transition-all duration-500 ease-out ${
            showExitButton && !areControlsHidden
              ? "translate-y-0 opacity-100"
              : "-translate-y-16 opacity-0"
          }`}
        >
          <button
            onClick={handleExit}
            className="p-3 rounded-full bg-black/60 hover:bg-red-600/80 text-white backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-lg"
            title="Exit fullscreen (ESC)"
          >
            <IconX size={24} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Center - Album Info */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-2xl">
            {/* Album Art */}
            <div className="relative mx-auto mb-8 w-80 h-80 rounded-2xl overflow-hidden shadow-2xl">
              {currentSong.albumArt ? (
                <img
                  src={currentSong.albumArt}
                  alt={currentSong.album}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${albumColors.primary}, ${albumColors.secondary})`,
                  }}
                >
                  <IconMusic size={120} className="text-white/80" />
                </div>
              )}
            </div>

            {/* Song Info */}
            <div
              className={`transition-opacity duration-500 ${
                areControlsHidden ? "opacity-30" : "opacity-100"
              }`}
            >
              <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {currentSong.title}
              </h1>
              <p className="text-2xl text-gray-300 mb-2">
                {currentSong.artist}
              </p>
              <p className="text-xl text-gray-400">{currentSong.album}</p>
            </div>
          </div>
        </div>

        {/* Bottom - Controls */}
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress Bar - Always visible */}
            <div className="flex items-center space-x-4 mb-8">
              <span
                className={`text-sm text-gray-400 w-12 text-right transition-opacity duration-500 ${
                  areControlsHidden ? "opacity-20" : "opacity-100"
                }`}
              >
                {formatTime(isSeeking ? localSeekPosition : progress)}
              </span>
              <div
                className={`flex-1 relative transition-opacity duration-500 ${
                  areControlsHidden ? "opacity-20" : "opacity-100"
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={isSeeking ? localSeekPosition : progress}
                  onChange={handleProgressChange}
                  onMouseUp={handleProgressMouseUp}
                  onMouseEnter={() => setIsProgressHovered(true)}
                  onMouseLeave={() => setIsProgressHovered(false)}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${
                      ((isSeeking ? localSeekPosition : progress) / duration) *
                      100
                    }%, #4b5563 ${
                      ((isSeeking ? localSeekPosition : progress) / duration) *
                      100
                    }%, #4b5563 100%)`,
                  }}
                />
              </div>
              <span
                className={`text-sm text-gray-400 w-12 text-left transition-opacity duration-500 ${
                  areControlsHidden ? "opacity-20" : "opacity-100"
                }`}
              >
                {formatTime(duration)}
              </span>
            </div>

            {/* Control Buttons - Hidden when controls are hidden */}
            <div
              className={`transition-all duration-500 ${
                areControlsHidden
                  ? "opacity-0 translate-y-4 pointer-events-none"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <div className="flex items-center justify-center space-x-8 mb-6">
                <button
                  onClick={onShuffle}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    isShuffled
                      ? "text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                  style={{
                    backgroundColor: isShuffled
                      ? albumColors.primary
                      : "transparent",
                  }}
                >
                  <IconArrowsShuffle size={24} />
                </button>

                <button
                  onClick={onPrevious}
                  className="p-4 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <IconPlayerTrackPrev size={32} />
                </button>

                <button
                  onClick={onPlayPause}
                  className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg text-black"
                >
                  {isPlaying ? (
                    <IconPlayerPause size={32} />
                  ) : (
                    <IconPlayerPlay size={32} className="ml-1" />
                  )}
                </button>

                <button
                  onClick={onNext}
                  className="p-4 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <IconPlayerTrackNext size={32} />
                </button>

                <button
                  onClick={onRepeat}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    repeatMode !== "none"
                      ? "text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                  style={{
                    backgroundColor:
                      repeatMode !== "none"
                        ? albumColors.primary
                        : "transparent",
                  }}
                >
                  {repeatMode === "one" ? (
                    <IconRepeatOnce size={24} />
                  ) : (
                    <IconRepeat size={24} />
                  )}
                </button>
              </div>

              {/* Volume Control - Hidden when controls are hidden */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleMuteToggle}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {volume === 0 ? (
                    <IconVolumeOff size={20} />
                  ) : volume < 0.5 ? (
                    <IconVolume2 size={20} />
                  ) : (
                    <IconVolume size={20} />
                  )}
                </button>

                <div className="w-32 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #ffffff ${
                        volume * 100
                      }%, #4b5563 ${volume * 100}%, #4b5563 100%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles for sliders */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default FullscreenPlayer;
