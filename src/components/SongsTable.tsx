import React, { useState, useEffect } from "react";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { JellyfinApiService } from "../services/jellyfinApi";
import { formatDuration } from "../types/jellyfin";
import type { MusicItem } from "../types/jellyfin";
import ImagePlaceholder from "./ImagePlaceholder";
import ArtistLinks from "./ArtistLinks";

interface SongsTableProps {
  songs: MusicItem[];
  onArtistClick?: (artistId: string, artistName: string) => void;
  showAlbumColumn?: boolean;
  showArtistInTitle?: boolean;
  isLoading?: boolean;
  loadingRows?: number;
  className?: string;
  // Context information for creating queues
  sourceContext?: {
    type: "album" | "artist" | "playlist";
    id: string;
    name?: string;
  };
  allSongs?: MusicItem[]; // All songs in the context (for proper queue creation)
}

interface SongRowProps {
  song: MusicItem;
  index: number;
  onArtistClick?: (artistId: string, artistName: string) => void;
  showAlbumColumn?: boolean;
  showArtistInTitle?: boolean;
  sourceContext?: {
    type: "album" | "artist" | "playlist";
    id: string;
    name?: string;
  };
  allSongs?: MusicItem[];
}

// Song Row Component
function SongRow({
  song,
  index,
  onArtistClick,
  showAlbumColumn = true,
  showArtistInTitle = true,
  sourceContext,
  allSongs,
}: SongRowProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState(false);
  const audioPlayer = useAudioPlayer();

  useEffect(() => {
    const loadImage = async () => {
      if (song.ImageTags && Object.keys(song.ImageTags).length > 0) {
        const url = await JellyfinApiService.getImageUrl(song.Id, "Primary");
        if (url) setImageUrl(url);
      } else if (song.AlbumId) {
        const url = await JellyfinApiService.getImageUrl(
          song.AlbumId,
          "Primary"
        );
        if (url) setImageUrl(url);
      }
    };
    loadImage();
  }, [song.Id, song.AlbumId]);

  const handleRowClick = async () => {
    try {
      // If we have context, create a proper queue
      if (sourceContext && allSongs && allSongs.length > 0) {
        // Convert all songs to the format expected by queue manager
        const convertMusicItemToSong = (item: MusicItem): any => ({
          id: item.Id,
          title: item.Name || "Unknown Title",
          artist:
            item.ArtistItems?.map((a) => a.Name).join(", ") ||
            item.AlbumArtist ||
            "Unknown Artist",
          album: item.Album || "Unknown Album",
          duration: item.RunTimeTicks
            ? Math.floor(item.RunTimeTicks / 10000000)
            : 0,
          track: item.IndexNumber,
          year: item.ProductionYear,
          artistIds: item.ArtistItems?.map((a) => a.Id) || [],
        });

        const convertedSongs = allSongs.map(convertMusicItemToSong);

        // Find the index of the clicked song
        const clickedSongIndex = allSongs.findIndex((s) => s.Id === song.Id);

        // Create queue starting from the clicked song
        const source = {
          type: sourceContext.type,
          id: sourceContext.id,
          name: sourceContext.name,
        };

        await audioPlayer.createQueueFromSource(
          convertedSongs,
          source,
          false,
          clickedSongIndex >= 0 ? clickedSongIndex : 0
        );

        console.log(
          `🎵 Created queue from ${sourceContext.type} and started playing: ${song.Name}`
        );
      } else {
        // Fallback to playing individual song (for search results, etc.)
        await audioPlayer.playSong(song.Id);
      }
    } catch (error) {
      console.error("Failed to play song:", error);
    }
  };

  const isCurrentSong = audioPlayer.state.currentSong?.id === song.Id;

  return (
    <tr
      className={`transition-colors cursor-pointer group border-b border-white/5 h-[72px] ${
        isCurrentSong
          ? "bg-red-500/10 hover:bg-red-500/15 border-l-4 border-red-500"
          : "hover:bg-white/5"
      }`}
      onClick={handleRowClick}
    >
      <td className="p-4 align-middle w-12">
        <span
          className={`text-gray-400 text-sm ${
            isCurrentSong ? "text-red-400 font-bold" : ""
          }`}
        >
          {index}
        </span>
      </td>

      <td className="p-4 align-middle max-w-0 w-2/5">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 flex-shrink-0">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={song.Name}
                className="w-10 h-10 rounded object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <ImagePlaceholder type="song" size="small" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4
              className={`font-medium truncate ${
                isCurrentSong ? "text-red-300" : "text-white"
              }`}
              title={song.Name}
            >
              {song.Name}
            </h4>
            {showArtistInTitle && (
              <div className="min-w-0">
                <ArtistLinks
                  item={song}
                  onArtistClick={onArtistClick}
                  className="text-sm text-gray-400 truncate block"
                />
              </div>
            )}
          </div>
        </div>
      </td>

      <td className="p-4 align-middle max-w-0 w-1/4">
        <div className="min-w-0">
          <ArtistLinks
            item={song}
            onArtistClick={onArtistClick}
            className="text-gray-300 truncate block"
          />
        </div>
      </td>

      {showAlbumColumn && (
        <td className="p-4 align-middle max-w-0 w-1/4">
          <span
            className="text-gray-300 truncate block"
            title={song.Album || "Unknown Album"}
          >
            {song.Album || "Unknown Album"}
          </span>
        </td>
      )}

      <td className="p-4 align-middle text-right w-20">
        <span className="text-gray-400 text-sm">
          {formatDuration(song.RunTimeTicks)}
        </span>
      </td>
    </tr>
  );
}

// Loading Skeleton Row
function SkeletonRow({
  showAlbumColumn = true,
}: {
  showAlbumColumn?: boolean;
}) {
  return (
    <tr className="border-b border-white/5 h-[72px] animate-pulse">
      <td className="p-4 align-middle w-12">
        <div className="w-4 h-4 bg-gray-600 rounded"></div>
      </td>
      <td className="p-4 align-middle max-w-0 w-2/5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-600 rounded flex-shrink-0"></div>
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-4 bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </td>
      <td className="p-4 align-middle max-w-0 w-1/4">
        <div className="h-4 bg-gray-600 rounded w-2/3"></div>
      </td>
      {showAlbumColumn && (
        <td className="p-4 align-middle max-w-0 w-1/4">
          <div className="h-4 bg-gray-600 rounded w-3/4"></div>
        </td>
      )}
      <td className="p-4 align-middle text-right w-20">
        <div className="h-4 bg-gray-600 rounded w-12 ml-auto"></div>
      </td>
    </tr>
  );
}

// Main SongsTable Component
export default function SongsTable({
  songs,
  onArtistClick,
  showAlbumColumn = true,
  showArtistInTitle = true,
  isLoading = false,
  loadingRows = 10,
  className = "",
  sourceContext,
  allSongs,
}: SongsTableProps) {
  if (isLoading) {
    return (
      <table className={`w-full table-pin-cols ${className}`}>
        <thead className="sticky top-0 z-20 bg-black/40 backdrop-blur-md">
          <tr className="border-b border-white/10">
            <th className="p-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider w-12">
              #
            </th>
            <th className="p-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider w-2/5">
              Title
            </th>
            <th className="p-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider w-1/4">
              Artist
            </th>
            {showAlbumColumn && (
              <th className="p-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider w-1/4">
                Album
              </th>
            )}
            <th className="p-4 text-right text-sm font-medium text-gray-400 uppercase tracking-wider w-20">
              Duration
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: loadingRows }, (_, index) => (
            <SkeletonRow key={index} showAlbumColumn={showAlbumColumn} />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className={`w-full table-pin-cols ${className}`}>
      <thead className="sticky top-0 z-20 bg-black/40 backdrop-blur-md">
        <tr className="border-b border-white/10">
          <th className="p-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider w-12">
            #
          </th>
          <th className="p-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider w-2/5">
            Title
          </th>
          <th className="p-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider w-1/4">
            Artist
          </th>
          {showAlbumColumn && (
            <th className="p-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider w-1/4">
              Album
            </th>
          )}
          <th className="p-4 text-right text-sm font-medium text-gray-400 uppercase tracking-wider w-20">
            Duration
          </th>
        </tr>
      </thead>
      <tbody>
        {songs.map((song, index) => (
          <SongRow
            key={song.Id}
            song={song}
            index={index + 1}
            onArtistClick={onArtistClick}
            showAlbumColumn={showAlbumColumn}
            showArtistInTitle={showArtistInTitle}
            sourceContext={sourceContext}
            allSongs={allSongs}
          />
        ))}
      </tbody>
    </table>
  );
}
