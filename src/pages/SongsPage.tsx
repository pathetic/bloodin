import { useState, useEffect, useRef, useCallback } from "react";
import { IconSearch, IconMusic } from "@tabler/icons-react";
import { JellyfinApiService } from "../services/jellyfinApi";
import { cacheService } from "../services/cacheService";
import type { MusicItem } from "../types/jellyfin";
import { formatDuration } from "../types/jellyfin";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { SkeletonGrid } from "../components/LoadingSkeleton";
import ImagePlaceholder from "../components/ImagePlaceholder";
import ArtistLinks from "../components/ArtistLinks";

interface SongsPageProps {
  onArtistClick?: (artistId: string, artistName: string) => void;
}

export default function SongsPage({ onArtistClick }: SongsPageProps) {
  const [songs, setSongs] = useState<MusicItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [searchResults, setSearchResults] = useState<MusicItem[]>([]);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fetchTimeoutRef = useRef<number>();
  const songsCountRef = useRef<number>(0);

  const BATCH_SIZE = 50;
  const SCROLL_DEBOUNCE_MS = 200;

  // Load total count first
  const loadTotalCount = useCallback(async () => {
    try {
      const response = await JellyfinApiService.getSongs(1, 0);
      if (response.success && response.total_count) {
        setTotalItems(response.total_count);
      }
    } catch (error) {
      console.error("Error loading total:", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  // Load more songs
  const loadMoreSongs = useCallback(async () => {
    if (searchTerm.trim() || isLoadingMore) return;

    const startIndex = songsCountRef.current;

    if (startIndex >= totalItems) return;

    setIsLoadingMore(true);
    try {
      const response = await JellyfinApiService.getSongs(
        BATCH_SIZE,
        startIndex
      );

      if (response.success && response.items) {
        setSongs((prev) => {
          const newSongs = [...prev, ...response.items!];
          songsCountRef.current = newSongs.length;
          return newSongs;
        });
      }
    } catch (error) {
      console.error("Error loading more songs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [totalItems, searchTerm, isLoadingMore, BATCH_SIZE]);

  // Debounced scroll handler - only loads when scrolling stops
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || searchTerm.trim()) return;

    const container = scrollContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Clear existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Check if we're near the bottom and need more data
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 1000;

    if (isNearBottom && songsCountRef.current < totalItems && !isLoadingMore) {
      // Debounced loading - only when scrolling stops
      fetchTimeoutRef.current = setTimeout(() => {
        loadMoreSongs();
      }, SCROLL_DEBOUNCE_MS);
    }
  }, [loadMoreSongs, totalItems, searchTerm, isLoadingMore]);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchTerm.trim()) {
      setIsInitialLoading(true);
      try {
        const result = await JellyfinApiService.searchMusic(searchTerm);
        if (result.success && result.items) {
          const searchSongs = result.items.filter(
            (item: MusicItem) => item.Type === "Audio"
          );
          setSearchResults(searchSongs);
        }
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setIsInitialLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Initialize
  useEffect(() => {
    loadTotalCount();
  }, [loadTotalCount]);

  // Load initial batch
  useEffect(() => {
    if (totalItems > 0 && !searchTerm.trim() && !hasLoadedInitial) {
      setHasLoadedInitial(true);
      loadMoreSongs();
    }
  }, [totalItems, searchTerm, hasLoadedInitial, loadMoreSongs]);

  // Scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [handleScroll]);

  // Display data
  const isSearchMode = searchTerm.trim() !== "";
  const displayItems = isSearchMode ? searchResults : songs;
  const displayTotal = isSearchMode ? searchResults.length : totalItems;

  return (
    <div className="flex flex-col h-full min-h-full">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 p-6 bg-black/15 backdrop-blur-md border-b border-white/10">
        <div className="max-w-full mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Songs</h1>
              <p className="text-gray-400 mt-1">
                {isSearchMode
                  ? `${displayItems.length} song${
                      displayItems.length !== 1 ? "s" : ""
                    } found`
                  : `${displayItems.length} of ${totalItems} song${
                      totalItems !== 1 ? "s" : ""
                    } loaded`}
              </p>
            </div>

            <form onSubmit={handleSearch} className="relative max-w-md w-full">
              <input
                type="text"
                placeholder="Search songs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <IconSearch size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-6 min-h-0">
        <div className="max-w-full mx-auto flex flex-col flex-1 min-h-0">
          {isInitialLoading ? (
            /* Loading State */
            <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden flex-1 flex flex-col min-w-full min-h-full">
              <TableHeader />
              <div className="flex-1 min-w-full min-h-full">
                <SkeletonGrid count={10} type="table" />
              </div>
            </div>
          ) : displayTotal === 0 ? (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center min-w-full min-h-full">
              <div className="text-center py-12">
                <IconMusic size={64} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  {isSearchMode ? "No songs found" : "No songs in library"}
                </h3>
                <p className="text-gray-500">
                  {isSearchMode
                    ? `No results found for "${searchTerm}"`
                    : "Your Jellyfin library appears to be empty."}
                </p>
              </div>
            </div>
          ) : (
            /* Main Table */
            <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden flex-1 flex flex-col min-w-full min-h-full">
              <TableHeader />

              {/* Scroll Container */}
              <div
                className="flex-1 overflow-auto min-w-full min-h-full scrollbar-hide pb-24"
                ref={scrollContainerRef}
              >
                <div className="min-w-full">
                  {displayItems.map((song, index) => (
                    <SongRow
                      key={song.Id}
                      song={song}
                      index={index + 1}
                      onArtistClick={onArtistClick}
                    />
                  ))}

                  {/* Loading More Indicator */}
                  {isLoadingMore && !isSearchMode && (
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2 text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                        <span>Loading more songs...</span>
                      </div>
                    </div>
                  )}

                  {/* Load More Trigger Area */}
                  {!isSearchMode &&
                    songs.length < totalItems &&
                    !isLoadingMore && (
                      <div className="p-8 text-center text-gray-500">
                        <p>Scroll down to load more songs</p>
                        <p className="text-sm mt-1">
                          {songs.length} of {totalItems} loaded
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Table Header Component
function TableHeader() {
  return (
    <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 text-sm font-medium text-gray-400 uppercase tracking-wider bg-white/5 flex-shrink-0 min-w-full">
      <div className="col-span-1">#</div>
      <div className="col-span-5">Title</div>
      <div className="col-span-3">Artist</div>
      <div className="col-span-2">Album</div>
      <div className="col-span-1 text-right">Duration</div>
    </div>
  );
}

// Song Row Component for MusicItem (Jellyfin format)
interface SongRowProps {
  song: MusicItem;
  index: number;
  onArtistClick?: (artistId: string, artistName: string) => void;
}

function SongRow({ song, index, onArtistClick }: SongRowProps) {
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
      await audioPlayer.playSong(song.Id);
    } catch (error) {
      console.error("Failed to play song:", error);
    }
  };

  const isCurrentSong = audioPlayer.state.currentSong?.id === song.Id;

  return (
    <div
      className={`grid grid-cols-12 gap-4 p-4 transition-colors cursor-pointer group border-b border-white/5 min-w-full ${
        isCurrentSong
          ? "bg-red-500/10 hover:bg-red-500/15 border-l-4 border-red-500"
          : "hover:bg-white/5"
      }`}
      style={{ height: 72 }}
      onClick={handleRowClick}
    >
      <div className="col-span-1 flex items-center">
        <span
          className={`text-gray-400 text-sm ${
            isCurrentSong ? "text-red-400 font-bold" : ""
          }`}
        >
          {index}
        </span>
      </div>

      <div className="col-span-5 flex items-center space-x-3 min-w-0">
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
        <div className="min-w-0">
          <h4 className="font-medium text-white truncate">{song.Name}</h4>
          <ArtistLinks
            item={song}
            onArtistClick={onArtistClick}
            className="text-sm text-gray-400 truncate"
          />
        </div>
      </div>

      <div className="col-span-3 flex items-center">
        <ArtistLinks
          item={song}
          onArtistClick={onArtistClick}
          className="text-gray-300 truncate"
        />
      </div>

      <div className="col-span-2 flex items-center">
        <span className="text-gray-300 truncate">
          {song.Album || "Unknown Album"}
        </span>
      </div>

      <div className="col-span-1 flex items-center justify-end">
        <span className="text-gray-400 text-sm">
          {formatDuration(song.RunTimeTicks)}
        </span>
      </div>
    </div>
  );
}
