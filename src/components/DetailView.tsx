import React, { useState, useEffect } from "react";
import {
  IconPlayerPlay,
  IconArrowsShuffle,
  IconArrowLeft,
  IconMusic,
  IconUser,
  IconDisc,
  IconPlaylist,
} from "@tabler/icons-react";
import { JellyfinApiService } from "../services/jellyfinApi";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import ImagePlaceholder from "./ImagePlaceholder";
import { SkeletonGrid } from "./LoadingSkeleton";
import type { MusicItem } from "../types/jellyfin";
import { formatDuration } from "../types/jellyfin";
import ArtistLinks from "./ArtistLinks";

interface DetailViewProps {
  type: "album" | "artist" | "playlist";
  id: string;
  name: string;
  onBack: () => void;
  onArtistClick: (artistId: string, artistName: string) => void;
}

export default function DetailView({
  type,
  id,
  name,
  onBack,
  onArtistClick,
}: DetailViewProps) {
  const [songs, setSongs] = useState<MusicItem[]>([]);
  const [details, setDetails] = useState<MusicItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const audioPlayer = useAudioPlayer();

  useEffect(() => {
    loadData();
  }, [id, type]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      let songsResult;
      let detailsResult = null;

      switch (type) {
        case "album":
          // Get album details and songs
          songsResult = await JellyfinApiService.getAlbumSongs(id);
          detailsResult = await JellyfinApiService.getItem(id);
          break;
        case "artist":
          // Get artist songs
          songsResult = await JellyfinApiService.getArtistSongs(id);
          detailsResult = await JellyfinApiService.getItem(id);
          break;
        case "playlist":
          // Get playlist songs (to be implemented when playlists are ready)
          songsResult = { success: false, items: [] };
          break;
        default:
          songsResult = { success: false, items: [] };
      }

      if (songsResult.success && songsResult.items) {
        setSongs(songsResult.items);
      }

      if (detailsResult?.success && detailsResult.item) {
        setDetails(detailsResult.item);

        // Load image for album, placeholder for others
        if (type === "album") {
          const url = await JellyfinApiService.getImageUrl(id, "Primary");
          if (url) {
            setImageUrl(url);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to load ${type} data:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAll = async () => {
    if (songs.length > 0) {
      try {
        // For now, just play the first song
        // TODO: Implement queue functionality
        await audioPlayer.playSong(songs[0].Id);
        console.log(`🎵 Playing all ${type} songs (${songs.length} tracks)`);
      } catch (error) {
        console.error("Failed to play:", error);
      }
    }
  };

  const handleShuffle = () => {
    setIsShuffled(!isShuffled);
    console.log(
      `🔀 Shuffle ${!isShuffled ? "enabled" : "disabled"} for ${type}`
    );
    // TODO: Implement shuffle functionality with queue
  };

  const handleSongClick = async (song: MusicItem) => {
    try {
      await audioPlayer.playSong(song.Id);
    } catch (error) {
      console.error("Failed to play song:", error);
    }
  };

  const getPlaceholderIcon = () => {
    switch (type) {
      case "album":
        return <IconDisc size={80} className="text-gray-400" />;
      case "artist":
        return <IconUser size={80} className="text-gray-400" />;
      case "playlist":
        return <IconPlaylist size={80} className="text-gray-400" />;
      default:
        return <IconMusic size={80} className="text-gray-400" />;
    }
  };

  const totalDuration = songs.reduce(
    (total, song) => total + (song.RunTimeTicks || 0),
    0
  );
  const totalDurationFormatted = formatDuration(totalDuration);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 bg-black/15 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <IconArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white capitalize">{type}</h1>
        </div>

        <div className="flex items-start space-x-6">
          {/* Image */}
          <div className="w-48 h-48 flex-shrink-0">
            {type === "album" && imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover rounded-xl shadow-lg"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-lg flex items-center justify-center">
                {getPlaceholderIcon()}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">{name}</h2>
              {details && (
                <div className="text-gray-400 space-y-1">
                  {type === "album" && (
                    <div className="text-lg flex items-center gap-2">
                      <span>by</span>
                      <ArtistLinks
                        item={details}
                        onArtistClick={onArtistClick}
                        className="text-gray-300"
                      />
                    </div>
                  )}
                  {details.ProductionYear && <p>{details.ProductionYear}</p>}
                  <p>
                    {songs.length} song{songs.length !== 1 ? "s" : ""} •{" "}
                    {totalDurationFormatted}
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <IconPlayerPlay size={20} />
                <span>Play All</span>
              </button>

              <button
                onClick={handleShuffle}
                disabled={songs.length === 0}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  isShuffled
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <IconArrowsShuffle size={20} />
                <span>Shuffle</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6">
            <SkeletonGrid count={8} type="table" />
          </div>
        ) : songs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <IconMusic size={64} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No songs found
              </h3>
              <p className="text-gray-500">
                This {type} appears to be empty or unavailable.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm font-medium text-gray-400 uppercase tracking-wider bg-white/5 sticky top-0">
              <div className="col-span-1">#</div>
              <div className="col-span-6">Title</div>
              <div className="col-span-3">Artist</div>
              <div className="col-span-2 text-right">Duration</div>
            </div>

            {/* Songs */}
            <div>
              {songs.map((song, index) => {
                const isCurrentSong =
                  audioPlayer.state.currentSong?.id === song.Id;
                return (
                  <div
                    key={song.Id}
                    onClick={() => handleSongClick(song)}
                    className={`grid grid-cols-12 gap-4 p-4 transition-colors cursor-pointer group border-b border-white/5 ${
                      isCurrentSong
                        ? "bg-red-500/10 hover:bg-red-500/15 border-l-4 border-red-500"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="col-span-1 flex items-center">
                      <span
                        className={`text-sm ${
                          isCurrentSong
                            ? "text-red-400 font-bold"
                            : "text-gray-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                    </div>

                    <div className="col-span-6 flex items-center min-w-0">
                      <div className="min-w-0">
                        <h4
                          className={`font-medium truncate ${
                            isCurrentSong ? "text-red-300" : "text-white"
                          }`}
                        >
                          {song.Name}
                        </h4>
                        {type !== "artist" && (
                          <ArtistLinks
                            item={song}
                            onArtistClick={onArtistClick}
                            className="text-sm text-gray-400 truncate"
                          />
                        )}
                      </div>
                    </div>

                    <div className="col-span-3 flex items-center">
                      <ArtistLinks
                        item={song}
                        onArtistClick={onArtistClick}
                        className="text-gray-300 truncate"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-gray-400 text-sm">
                        {formatDuration(song.RunTimeTicks)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
