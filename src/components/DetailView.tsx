import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import SongsTable from "./SongsTable";
import type { MusicItem } from "../types/jellyfin";
import { formatDetailedDuration, getArtistName } from "../types/jellyfin";
import ArtistLinks from "./ArtistLinks";

interface DetailViewProps {
  type: "album" | "artist" | "playlist";
}

// Helper function to convert MusicItem to Song
const convertMusicItemToSong = (item: MusicItem): any => ({
  id: item.Id,
  title: item.Name || "Unknown Title",
  artist: getArtistName(item),
  album: item.Album || "Unknown Album",
  duration: item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : 0,
  track: item.IndexNumber,
  year: item.ProductionYear,
  artistIds: item.ArtistItems?.map((a) => a.Id) || [],
});

// Helper function to fetch ALL songs for a playlist by using pagination
const fetchAllPlaylistSongs = async (
  playlistId: string
): Promise<MusicItem[]> => {
  const allSongs: MusicItem[] = [];
  const batchSize = 1000; // Use a reasonable batch size
  let startIndex = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await JellyfinApiService.getPlaylistSongs(
        playlistId,
        batchSize,
        startIndex
      );

      if (response.success && response.items && response.items.length > 0) {
        allSongs.push(...response.items);
        startIndex += response.items.length;

        // Check if we got fewer items than requested, indicating end
        hasMore = response.items.length === batchSize;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(
        `Error fetching playlist songs batch starting at ${startIndex}:`,
        error
      );
      hasMore = false;
    }
  }

  return allSongs;
};

export default function DetailView({ type }: DetailViewProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<MusicItem[]>([]);
  const [details, setDetails] = useState<MusicItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalSongs, setTotalSongs] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioPlayer = useAudioPlayer();

  // Add state to track all songs for queue creation
  const [allSongsForQueue, setAllSongsForQueue] = useState<MusicItem[]>([]);

  const BATCH_SIZE = 100;

  const handleArtistClick = (artistId: string, artistName: string) => {
    navigate(`/artist/${artistId}`);
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Load initial batch for playlists
  const loadInitialPlaylistSongs = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const response = await JellyfinApiService.getPlaylistSongs(
        id,
        BATCH_SIZE,
        0
      );
      if (response.success) {
        setSongs(response.items || []);
        setTotalSongs(response.total_count || 0);
        setHasMore((response.items?.length || 0) < (response.total_count || 0));
      }
    } catch (error) {
      console.error("Error loading initial playlist songs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Load more playlist songs
  const loadMorePlaylistSongs = useCallback(async () => {
    if (!id || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const response = await JellyfinApiService.getPlaylistSongs(
        id,
        BATCH_SIZE,
        songs.length
      );
      if (response.success && response.items) {
        setSongs((prev) => [...prev, ...response.items!]);
        setHasMore(songs.length + response.items.length < totalSongs);
      }
    } catch (error) {
      console.error("Error loading more playlist songs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [id, isLoadingMore, hasMore, songs.length, totalSongs]);

  // Handle scroll for playlists
  const handleScroll = useCallback(() => {
    if (type !== "playlist") return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 200; // Load more when 200px from bottom

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMorePlaylistSongs();
    }
  }, [type, loadMorePlaylistSongs]);

  useEffect(() => {
    if (!id) return;

    // Clear previous data immediately when switching
    setSongs([]);
    setDetails(null);
    setImageUrl(undefined);
    setImageError(false);
    setIsLoadingMore(false);
    setTotalSongs(0);
    setHasMore(true);
    setAllSongsForQueue([]); // Clear queue context

    loadData();
  }, [id, type]);

  // Set up scroll listener for playlists
  useEffect(() => {
    if (type !== "playlist") return;

    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [type, handleScroll]);

  const loadData = async () => {
    if (!id) return;

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
          // For playlists, get details and use pagination for songs
          detailsResult = await JellyfinApiService.getItem(id);

          // Set playlist details immediately
          if (detailsResult?.success && detailsResult.item) {
            setDetails(detailsResult.item);
          }

          // Load all songs for queue context
          const allPlaylistSongs = await fetchAllPlaylistSongs(id);
          setAllSongsForQueue(allPlaylistSongs);

          // Songs will be loaded by loadInitialPlaylistSongs
          loadInitialPlaylistSongs();
          return; // Early return to avoid setting songs twice
        default:
          songsResult = { success: false, items: [] };
      }

      if (songsResult && songsResult.success && songsResult.items) {
        setSongs(songsResult.items);
        setTotalSongs(songsResult.items.length);
        // For albums and artists, the displayed songs are the same as all songs
        setAllSongsForQueue(songsResult.items);
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
    if (!id) return;

    try {
      setIsPlayingAll(true);

      // Fetch ALL songs for this source to create complete queue
      let allSongs: MusicItem[] = [];

      switch (type) {
        case "album":
          const albumResult = await JellyfinApiService.getAlbumSongs(id);
          allSongs = albumResult?.success ? albumResult.items || [] : [];
          break;
        case "artist":
          const artistResult = await JellyfinApiService.getArtistSongs(id);
          allSongs = artistResult?.success ? artistResult.items || [] : [];
          break;
        case "playlist":
          // Use the helper to fetch all playlist songs
          allSongs = await fetchAllPlaylistSongs(id);
          break;
        default:
          return;
      }

      if (allSongs.length > 0) {
        // Create queue from complete song list
        const source = {
          type: type as "album" | "artist" | "playlist",
          id: id,
          name: details?.Name,
        };

        const convertedSongs = allSongs.map(convertMusicItemToSong);
        await audioPlayer.createQueueFromSource(
          convertedSongs,
          source,
          false,
          0
        );
        console.log(
          `🎵 Playing all ${type} songs (${convertedSongs.length} total tracks)`
        );
      } else {
        console.warn(`No songs found for ${type}: ${id}`);
      }
    } catch (error) {
      console.error("Failed to play:", error);
    } finally {
      setIsPlayingAll(false);
    }
  };

  const handleShuffle = async () => {
    if (!id) return;

    try {
      setIsShuffling(true);

      // Fetch ALL songs for this source to create complete shuffled queue
      let allSongs: MusicItem[] = [];

      switch (type) {
        case "album":
          const albumResult = await JellyfinApiService.getAlbumSongs(id);
          allSongs = albumResult?.success ? albumResult.items || [] : [];
          break;
        case "artist":
          const artistResult = await JellyfinApiService.getArtistSongs(id);
          allSongs = artistResult?.success ? artistResult.items || [] : [];
          break;
        case "playlist":
          // Use the helper to fetch all playlist songs
          allSongs = await fetchAllPlaylistSongs(id);
          break;
        default:
          return;
      }

      if (allSongs.length > 0) {
        // Create shuffled queue from complete song list
        const source = {
          type: type as "album" | "artist" | "playlist",
          id: id,
          name: details?.Name,
        };

        const convertedSongs = allSongs.map(convertMusicItemToSong);
        // Start at a random position when shuffling for true randomness
        const randomStartIndex = Math.floor(
          Math.random() * convertedSongs.length
        );
        await audioPlayer.createQueueFromSource(
          convertedSongs,
          source,
          true,
          randomStartIndex
        );
        console.log(
          `🔀 Shuffle enabled and playing ${type} (${convertedSongs.length} total tracks, starting at random position ${randomStartIndex})`
        );
      } else {
        console.warn(`No songs found for ${type}: ${id}`);
      }
    } catch (error) {
      console.error("Failed to play with shuffle:", error);
    } finally {
      setIsShuffling(false);
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
  const totalDurationFormatted = formatDetailedDuration(totalDuration);

  const isPlaylist = type === "playlist";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 bg-black/15 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={handleBack}
            className="cursor-pointer p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <IconArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-base-content capitalize">
            {type}
          </h1>
        </div>

        <div className="flex items-start space-x-6">
          {/* Image */}
          <div className="w-48 h-48 flex-shrink-0">
            {type === "album" && imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={details?.Name || ""}
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
              <h2 className="text-4xl font-bold text-base-content mb-2">
                {details?.Name}
              </h2>
              {details && (
                <div className="text-base-content/60 space-y-1">
                  {type === "album" && (
                    <div className="text-lg flex items-center gap-2">
                      <span>by</span>
                      <ArtistLinks
                        item={details}
                        onArtistClick={handleArtistClick}
                        className="text-base-content/60"
                      />
                    </div>
                  )}
                  {details.ProductionYear && <p>{details.ProductionYear}</p>}
                  <p>
                    {isPlaylist ? (
                      <>
                        {songs.length} of {totalSongs} song
                        {totalSongs !== 1 ? "s" : ""} loaded •{" "}
                        {totalDurationFormatted}
                      </>
                    ) : (
                      <>
                        {songs.length} song{songs.length !== 1 ? "s" : ""} •{" "}
                        {totalDurationFormatted}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePlayAll}
                disabled={songs.length === 0 || isPlayingAll}
                className="cursor-pointer flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <IconPlayerPlay size={20} />
                <span>{isPlayingAll ? "Loading..." : "Play All"}</span>
              </button>

              <button
                onClick={handleShuffle}
                disabled={songs.length === 0 || isShuffling}
                className="cursor-pointer flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors bg-base-content/40 hover:bg-base-content/60 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IconArrowsShuffle size={20} />
                <span>{isShuffling ? "Loading..." : "Shuffle"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <SongsTable
            songs={[]}
            isLoading={true}
            loadingRows={8}
            onArtistClick={handleArtistClick}
            showAlbumColumn={false}
            showArtistInTitle={type !== "artist"}
          />
        ) : songs.length === 0 ? (
          <div className="h-full flex items-center justify-center px-6">
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
          <div ref={scrollContainerRef} className="h-full overflow-auto">
            <SongsTable
              songs={songs}
              onArtistClick={handleArtistClick}
              showAlbumColumn={false}
              showArtistInTitle={type !== "artist"}
              sourceContext={{
                type: type,
                id: id!,
                name: details?.Name,
              }}
              allSongs={allSongsForQueue}
            />

            {/* Loading more indicator - only for playlists */}
            {isPlaylist && isLoadingMore && (
              <div className="p-6 text-center">
                <div className="flex items-center justify-center space-x-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm">Loading more songs...</span>
                </div>
              </div>
            )}

            {/* End indicator - only for playlists */}
            {isPlaylist && !hasMore && songs.length > 0 && (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-500">
                  All {totalSongs} songs loaded
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
