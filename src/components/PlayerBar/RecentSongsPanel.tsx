import React from "react";
import { Song } from "../../types";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import { IconHistory, IconMusic } from "@tabler/icons-react";
import ClickableArtists from "./ClickableArtists";

interface RecentSongsPanelProps {
  currentSong?: Song;
  isOpen: boolean;
  onClose: () => void;
  recentSongsRef: React.RefObject<HTMLDivElement>;
  onArtistClick?: (artistId: string, artistName: string) => void;
}

const RecentSongsPanel: React.FC<RecentSongsPanelProps> = ({
  currentSong,
  isOpen,
  onClose,
  recentSongsRef,
  onArtistClick,
}) => {
  const audioPlayerContext = useAudioPlayer();
  const recentlyPlayed = audioPlayerContext.getRecentlyPlayed();

  const handleRecentSongPlay = async (song: Song) => {
    try {
      await audioPlayerContext.playSong(song.id);
      onClose();
    } catch (error) {
      console.error("Failed to play recent song:", error);
    }
  };

  if (!isOpen || recentlyPlayed.length === 0) {
    return null;
  }

  return (
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
            onClick={onClose}
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
                    <ClickableArtists
                      artistString={song.artist}
                      artistIds={song.artistIds}
                      onArtistClick={onArtistClick}
                    />
                    {song.album && ` • ${song.album}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentSongsPanel;
