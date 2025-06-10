import { useState } from "react";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import {
  IconVolume,
  IconVolume2,
  IconVolumeOff,
  IconArrowsMaximize,
  IconHistory,
  IconPlaylist,
} from "@tabler/icons-react";

interface VolumeControlsProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  onFullscreen?: () => void;
  isRecentSongsOpen: boolean;
  setIsRecentSongsOpen: (open: boolean) => void;
  isQueueOpen: boolean;
  setIsQueueOpen: (open: boolean) => void;
  historyButtonRef: React.RefObject<HTMLButtonElement>;
  queueButtonRef: React.RefObject<HTMLButtonElement>;
}

const VolumeControls: React.FC<VolumeControlsProps> = ({
  volume,
  onVolumeChange,
  onFullscreen,
  isRecentSongsOpen,
  setIsRecentSongsOpen,
  isQueueOpen,
  setIsQueueOpen,
  historyButtonRef,
  queueButtonRef,
}) => {
  const [previousVolume, setPreviousVolume] = useState(1);

  const audioPlayerContext = useAudioPlayer();
  const recentlyPlayed = audioPlayerContext.getRecentlyPlayed();

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

  return (
    <div className="flex items-center justify-end w-80">
      <div className="flex items-center space-x-3">
        <button
          onClick={handleMuteToggle}
          className="p-2 rounded-lg text-base-content/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
          onClick={onFullscreen}
          className="p-2 rounded-lg text-base-content/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Enter fullscreen mode"
        >
          <IconArrowsMaximize size={16} />
        </button>

        <button
          ref={historyButtonRef}
          onClick={() => setIsRecentSongsOpen(!isRecentSongsOpen)}
          className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
            recentlyPlayed.length === 0
              ? "text-base-content/30 cursor-not-allowed"
              : isRecentSongsOpen
              ? "text-white bg-red-500"
              : "text-base-content/70 hover:text-white hover:bg-white/10"
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

        <button
          ref={queueButtonRef}
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
            isQueueOpen
              ? "text-white bg-red-500"
              : "text-base-content/70 hover:text-white hover:bg-white/10"
          }`}
          title={isQueueOpen ? "Hide queue" : "Show queue"}
        >
          <IconPlaylist size={16} />
        </button>
      </div>
    </div>
  );
};

export default VolumeControls;
