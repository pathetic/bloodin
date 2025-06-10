import React, { useState } from "react";

interface ProgressBarProps {
  progress: number;
  duration: number;
  isSeeking?: boolean;
  onSeek: (position: number) => void;
  onStartSeeking?: () => void;
  onStopSeeking?: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  duration,
  isSeeking = false,
  onSeek,
  onStartSeeking,
  onStopSeeking,
}) => {
  const [localSeekPosition, setLocalSeekPosition] = useState(0);
  const [isProgressHovered, setIsProgressHovered] = useState(false);

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

  return (
    <div className="w-full max-w-lg flex items-center space-x-3 mb-[0.5rem]">
      <span className="text-xs text-base-content/60 w-10 text-right">
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
              ((isSeeking ? localSeekPosition : progress) / duration) * 100
            }%, #4b5563 ${
              ((isSeeking ? localSeekPosition : progress) / duration) * 100
            }%, #4b5563 100%)`,
          }}
        />
      </div>
      <span className="text-xs text-base-content/60 w-10 text-left">
        {formatTime(duration)}
      </span>
    </div>
  );
};

export default ProgressBar;
