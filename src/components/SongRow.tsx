import React from "react";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import ImagePlaceholder from "./ImagePlaceholder";
import type { Song } from "../types";

interface SongRowProps {
  song: Song;
  index: number;
  showIndex?: boolean;
  compact?: boolean;
  onArtistClick?: (artistId: string, artistName: string) => void;
}

// Helper component to render multiple clickable artists
const ClickableArtists: React.FC<{
  artistString: string;
  artistIds?: string[];
  onArtistClick?: (artistId: string, artistName: string) => void;
  className?: string;
}> = ({ artistString, artistIds, onArtistClick, className = "" }) => {
  if (!onArtistClick || !artistIds || artistIds.length === 0) {
    return <span className={className}>{artistString}</span>;
  }

  // Split artist string by " & " to get individual artist names
  const artistNames = artistString.split(" & ");

  // If we have mismatched counts, fall back to non-clickable display
  if (artistNames.length !== artistIds.length) {
    return <span className={className}>{artistString}</span>;
  }

  return (
    <span className={className}>
      {artistNames.map((artistName, index) => (
        <React.Fragment key={artistIds[index]}>
          <span
            className="hover:text-red-500 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onArtistClick(artistIds[index], artistName.trim());
            }}
          >
            {artistName.trim()}
          </span>
          {index < artistNames.length - 1 && " & "}
        </React.Fragment>
      ))}
    </span>
  );
};

export default function SongRow({
  song,
  index,
  showIndex = true,
  compact = false,
  onArtistClick,
}: SongRowProps) {
  const audioPlayer = useAudioPlayer();

  const handlePlaySong = async () => {
    try {
      await audioPlayer.playSong(song.id);
    } catch (error) {
      console.error("Failed to play song:", error);
    }
  };

  const isCurrentSong = audioPlayer.state.currentSong?.id === song.id;

  if (compact) {
    return (
      <div
        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer group transition-colors ${
          isCurrentSong
            ? "bg-red-500/10 hover:bg-red-500/15"
            : "hover:bg-white/5"
        }`}
        onClick={handlePlaySong}
      >
        {showIndex && (
          <div className="w-8 text-center">
            <span
              className={`text-sm ${
                isCurrentSong
                  ? "text-red-500 font-bold"
                  : "text-gray-400 group-hover:hidden"
              }`}
            >
              {index}
            </span>
            <button
              className={`p-1 rounded-full hover:bg-red-500 transition-colors ${
                isCurrentSong
                  ? "text-red-500"
                  : "text-white hidden group-hover:block"
              }`}
            >
              <IconPlayerPlay size={14} />
            </button>
          </div>
        )}

        <div className="w-10 h-10 flex-shrink-0">
          {song.albumArt ? (
            <img
              src={song.albumArt}
              alt={song.title}
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <ImagePlaceholder type="song" size="small" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4
            className={`font-medium truncate ${
              isCurrentSong ? "text-red-500" : "text-base-content"
            }`}
          >
            {song.title}
          </h4>
          <p className="text-sm text-gray-400 truncate">
            <ClickableArtists
              artistString={song.artist}
              artistIds={song.artistIds}
              onArtistClick={onArtistClick}
            />
            {song.album && ` • ${song.album}`}
          </p>
        </div>
      </div>
    );
  }

  // Full table row format (for SongsPage style)
  return (
    <div
      className={`grid grid-cols-12 gap-4 p-4 transition-colors cursor-pointer group border-b border-white/5 min-w-full ${
        isCurrentSong
          ? "bg-red-500/10 hover:bg-red-500/15 border-l-4 border-red-500"
          : "hover:bg-white/5"
      }`}
      style={{ height: 72 }}
      onClick={handlePlaySong}
    >
      <div className="col-span-1 flex items-center">
        <span
          className={`text-gray-400 text-sm ${
            isCurrentSong ? "text-red-500 font-bold" : ""
          }`}
        >
          {index}
        </span>
      </div>

      <div className="col-span-5 flex items-center space-x-3 min-w-0">
        <div className="w-10 h-10 flex-shrink-0">
          {song.albumArt ? (
            <img
              src={song.albumArt}
              alt={song.title}
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <ImagePlaceholder type="song" size="small" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-medium text-white truncate">{song.title}</h4>
          <p className="text-sm text-gray-400 truncate">
            <ClickableArtists
              artistString={song.artist}
              artistIds={song.artistIds}
              onArtistClick={onArtistClick}
            />
          </p>
        </div>
      </div>

      <div className="col-span-3 flex items-center">
        <span className="text-gray-300 truncate">
          <ClickableArtists
            artistString={song.artist}
            artistIds={song.artistIds}
            onArtistClick={onArtistClick}
          />
        </span>
      </div>

      <div className="col-span-2 flex items-center">
        <span className="text-gray-300 truncate">
          {song.album || "Unknown Album"}
        </span>
      </div>

      <div className="col-span-1 flex items-center justify-end">
        <span className="text-gray-400 text-sm">
          {song.duration || "--:--"}
        </span>
      </div>
    </div>
  );
}
