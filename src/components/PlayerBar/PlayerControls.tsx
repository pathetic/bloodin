import React from "react";
import { Song } from "../../types";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import {
  IconArrowsShuffle,
  IconPlayerTrackPrev,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerTrackNext,
  IconRepeat,
  IconRepeatOnce,
} from "@tabler/icons-react";

interface PlayerControlsProps {
  currentSong?: Song;
  isPlaying: boolean;
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentSong,
  isPlaying,
  isShuffled,
  repeatMode,
  onPlayPause,
  onNext,
  onPrevious,
  onShuffle,
  onRepeat,
}) => {
  const audioPlayerContext = useAudioPlayer();
  const lastPlayedSong = audioPlayerContext.getLastPlayedSong();

  const displaySong =
    currentSong || (lastPlayedSong ? lastPlayedSong.song : null);
  const isShowingLastPlayed = !currentSong && lastPlayedSong;

  const handlePreviousClick = () => {
    // Call the previous track function from AudioPlayerContext
    // which now has the proper queue management and 10-second rule
    onPrevious();
  };

  return (
    <div className="flex items-center justify-center space-x-6 mb-[0.05rem] pt-2">
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
          isShowingLastPlayed && displaySong
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
  );
};

export default PlayerControls;
