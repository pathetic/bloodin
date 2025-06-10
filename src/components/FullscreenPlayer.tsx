import { useState, useEffect, useRef } from "react";
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
  const [_isProgressHovered, setIsProgressHovered] = useState(false);
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
      let retries = 0;
      const maxRetries = 5;

      while (retries < maxRetries) {
        try {
          const window = getCurrentWindow();

          // Check if window is valid
          if (!window) {
            throw new Error("Invalid window object");
          }

          await window.setFullscreen(true);
          console.log("🚀 Entered native fullscreen mode");
          return; // Success, exit the retry loop
        } catch (error) {
          retries++;
          console.warn(
            `Failed to enter fullscreen (attempt ${retries}/${maxRetries}):`,
            error
          );

          if (retries < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 100 * retries));
          } else {
            console.error(
              "Failed to enter fullscreen after all retries:",
              error
            );
          }
        }
      }
    };

    enterFullscreen();

    // Exit fullscreen when component unmounts
    return () => {
      const exitFullscreen = async () => {
        let retries = 0;
        const maxRetries = 5;

        while (retries < maxRetries) {
          try {
            const window = getCurrentWindow();

            // Check if window is valid
            if (!window) {
              throw new Error("Invalid window object");
            }

            await window.setFullscreen(false);
            console.log("🚀 Exited native fullscreen mode");
            return; // Success, exit the retry loop
          } catch (error) {
            retries++;
            console.warn(
              `Failed to exit fullscreen (attempt ${retries}/${maxRetries}):`,
              error
            );

            if (retries < maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, 100 * retries)
              );
            } else {
              console.error(
                "Failed to exit fullscreen after all retries:",
                error
              );
            }
          }
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

  // Handle ESC key, F key, and exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleExit();
      }
    };

    // Add a small delay before listening to prevent catching the same 'f' press that entered fullscreen
    const timeoutId = setTimeout(() => {
      window.addEventListener("keydown", handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleExit = async () => {
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      try {
        const window = getCurrentWindow();

        // Check if window is valid
        if (!window) {
          throw new Error("Invalid window object");
        }

        await window.setFullscreen(false);
        onExit();
        return; // Success, exit the retry loop
      } catch (error) {
        retries++;
        console.warn(
          `Failed to exit fullscreen (attempt ${retries}/${maxRetries}):`,
          error
        );

        if (retries < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 100 * retries));
        } else {
          console.error("Failed to exit fullscreen after all retries:", error);
          onExit(); // Fallback - exit anyway
        }
      }
    }
  };

  // Handle double-click to exit
  const handleDoubleClick = () => {
    handleExit();
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

  // Handle volume wheel scrolling
  const handleVolumeWheel = (e: React.WheelEvent<HTMLDivElement>) => {
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

  if (!currentSong) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black overflow-hidden ${
        isMouseHidden ? "cursor-none" : ""
      }`}
      onDoubleClick={handleDoubleClick}
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
            title="Exit fullscreen (ESC or F)"
          >
            <IconX size={24} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col justify-center items-center">
        {/* Center - Album Info and Controls */}
        <div
          className={`flex flex-col items-center max-w-4xl w-full px-8 transition-all duration-700 ${
            areControlsHidden ? "translate-y-12" : "translate-y-0"
          }`}
        >
          {/* Album Art */}
          <div
            className={`relative w-72 h-72 rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ${
              areControlsHidden ? "mb-8" : "mb-12"
            }`}
          >
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
                <IconMusic size={100} className="text-white/80" />
              </div>
            )}
          </div>

          {/* Song Info */}
          <div
            className={`text-center transition-all duration-700 ${
              areControlsHidden ? "opacity-20 mb-8" : "opacity-100 mb-16"
            }`}
          >
            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg max-w-2xl">
              {currentSong.title}
            </h1>
            <p className="text-xl text-white/80 mb-2">{currentSong.artist}</p>
            <p className="text-lg text-white/60">{currentSong.album}</p>
          </div>

          {/* Progress Bar */}
          <div
            className={`w-full max-w-2xl transition-all duration-700 ${
              areControlsHidden ? "opacity-20" : "opacity-100 mb-12"
            }`}
          >
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/60 w-12 text-right font-mono flex items-center justify-end">
                {formatTime(isSeeking ? localSeekPosition : progress)}
              </span>
              <div className="flex-1 relative group flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={isSeeking ? localSeekPosition : progress}
                  onChange={handleProgressChange}
                  onMouseUp={handleProgressMouseUp}
                  onMouseEnter={() => setIsProgressHovered(true)}
                  onMouseLeave={() => setIsProgressHovered(false)}
                  className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer transition-all hover:h-3"
                  style={{
                    background: `linear-gradient(to right, ${
                      albumColors.primary
                    } 0%, ${albumColors.primary} ${
                      ((isSeeking ? localSeekPosition : progress) / duration) *
                      100
                    }%, rgba(255,255,255,0.2) ${
                      ((isSeeking ? localSeekPosition : progress) / duration) *
                      100
                    }%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />
              </div>
              <span className="text-sm text-white/60 w-12 text-left font-mono flex items-center justify-start">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Main Controls */}
          <div
            className={`transition-all duration-500 ${
              areControlsHidden
                ? "opacity-0 translate-y-8 pointer-events-none"
                : "opacity-100 translate-y-0"
            }`}
          >
            {/* Primary Control Buttons */}
            <div className="flex items-center justify-center space-x-8 mb-8">
              <button
                onClick={onShuffle}
                className={`p-4 rounded-full transition-all duration-300 hover:scale-110 ${
                  isShuffled
                    ? "text-white shadow-xl scale-105"
                    : "text-white/60 hover:text-white hover:bg-white/10"
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
                className="p-4 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110"
              >
                <IconPlayerTrackPrev size={28} />
              </button>

              <button
                onClick={onPlayPause}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-all duration-300 shadow-2xl text-black"
              >
                {isPlaying ? (
                  <IconPlayerPause size={36} />
                ) : (
                  <IconPlayerPlay size={36} className="ml-1" />
                )}
              </button>

              <button
                onClick={onNext}
                className="p-4 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110"
              >
                <IconPlayerTrackNext size={28} />
              </button>

              <button
                onClick={onRepeat}
                className={`p-4 rounded-full transition-all duration-300 hover:scale-110 ${
                  repeatMode !== "none"
                    ? "text-white shadow-xl scale-105"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                style={{
                  backgroundColor:
                    repeatMode !== "none" ? albumColors.primary : "transparent",
                }}
              >
                {repeatMode === "one" ? (
                  <IconRepeatOnce size={24} />
                ) : (
                  <IconRepeat size={24} />
                )}
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handleMuteToggle}
                className="p-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
              >
                {volume === 0 ? (
                  <IconVolumeOff size={20} />
                ) : volume < 0.5 ? (
                  <IconVolume2 size={20} />
                ) : (
                  <IconVolume size={20} />
                )}
              </button>

              <div
                className="w-40 relative group flex items-center"
                onWheel={handleVolumeWheel}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer transition-all hover:h-2"
                  style={{
                    background: `linear-gradient(to right, ${
                      albumColors.accent
                    } 0%, ${albumColors.accent} ${
                      volume * 100
                    }%, rgba(255,255,255,0.2) ${
                      volume * 100
                    }%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />
              </div>

              <span className="text-sm text-white/60 w-10 text-left font-mono">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles for sliders */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        
        input[type="range"]:hover::-webkit-slider-thumb {
          transform: scale(1.2);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        
        input[type="range"]:hover::-moz-range-thumb {
          transform: scale(1.2);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
};

export default FullscreenPlayer;
