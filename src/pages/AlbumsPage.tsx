import { useState, useEffect, useRef, useCallback } from "react";
import {
  IconSearch,
  IconMusic,
  IconPlayerPlay,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { JellyfinApiService } from "../services/jellyfinApi";
import { cacheService } from "../services/cacheService";
import type { MusicItem } from "../types/jellyfin";
import { getArtistName } from "../types/jellyfin";
import ImagePlaceholder from "../components/ImagePlaceholder";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<MusicItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalItems, setTotalItems] = useState(0);
  const [searchResults, setSearchResults] = useState<MusicItem[]>([]);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fetchTimeoutRef = useRef<number>();
  const albumsCountRef = useRef<number>(0);

  const BATCH_SIZE = 24;
  const SCROLL_DEBOUNCE_MS = 200;

  // Load total count first
  const loadTotalCount = useCallback(async () => {
    try {
      const response = await JellyfinApiService.getAlbums(1, 0);
      if (response.success && response.total_count) {
        setTotalItems(response.total_count);
      }
    } catch (error) {
      console.error("Error loading total:", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  // Load more albums
  const loadMoreAlbums = useCallback(async () => {
    if (searchTerm.trim() || isLoadingMore) return;

    const startIndex = albumsCountRef.current;

    if (startIndex >= totalItems) return;

    setIsLoadingMore(true);
    try {
      const response = await JellyfinApiService.getAlbums(
        BATCH_SIZE,
        startIndex
      );

      if (response.success && response.items) {
        setAlbums((prev) => {
          const newAlbums = [...prev, ...response.items!];
          albumsCountRef.current = newAlbums.length;
          return newAlbums;
        });
      }
    } catch (error) {
      console.error("Error loading more albums:", error);
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

    if (isNearBottom && albumsCountRef.current < totalItems && !isLoadingMore) {
      // Debounced loading - only when scrolling stops
      fetchTimeoutRef.current = setTimeout(() => {
        loadMoreAlbums();
      }, SCROLL_DEBOUNCE_MS);
    }
  }, [loadMoreAlbums, totalItems, searchTerm, isLoadingMore]);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchTerm.trim()) {
      setIsInitialLoading(true);
      try {
        const result = await JellyfinApiService.searchMusic(searchTerm);
        if (result.success && result.items) {
          const searchAlbums = result.items.filter(
            (item: MusicItem) => item.Type === "MusicAlbum"
          );
          setSearchResults(searchAlbums);
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
      loadMoreAlbums();
    }
  }, [totalItems, searchTerm, hasLoadedInitial, loadMoreAlbums]);

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
  const displayItems = isSearchMode ? searchResults : albums;
  const displayTotal = isSearchMode ? searchResults.length : totalItems;

  return (
    <div className="flex flex-col h-full min-h-full">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 p-6 bg-black/15 backdrop-blur-md border-b border-white/10">
        <div className="max-w-full mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Albums</h1>
              <p className="text-gray-400 mt-1">
                {isSearchMode
                  ? `${displayItems.length} album${
                      displayItems.length !== 1 ? "s" : ""
                    } found`
                  : `${displayItems.length} of ${totalItems} album${
                      totalItems !== 1 ? "s" : ""
                    } loaded`}
              </p>
            </div>

            <form onSubmit={handleSearch} className="relative max-w-md w-full">
              <input
                type="text"
                placeholder="Search albums..."
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
            <div className="flex-1 min-w-full min-h-full">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {[...Array(12)].map((_, i) => (
                  <SkeletonCard key={`skeleton-${i}`} />
                ))}
              </div>
            </div>
          ) : displayTotal === 0 ? (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center min-w-full min-h-full">
              <div className="text-center py-12">
                <IconMusic size={64} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  {isSearchMode ? "No albums found" : "No albums in library"}
                </h3>
                <p className="text-gray-500">
                  {isSearchMode
                    ? `No results found for "${searchTerm}"`
                    : "Your Jellyfin library appears to be empty."}
                </p>
              </div>
            </div>
          ) : (
            /* Albums Grid */
            <div
              className="flex-1 overflow-auto min-w-full min-h-full scrollbar-hide no-scrollbar"
              ref={scrollContainerRef}
            >
              <div className="space-y-6 no-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 no-scrollbar">
                  {displayItems.map((album) => (
                    <AlbumCard key={album.Id} album={album} />
                  ))}
                </div>

                {/* Loading More Indicator */}
                {isLoadingMore && !isSearchMode && (
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                      <span>Loading more albums...</span>
                    </div>
                  </div>
                )}

                {/* Load More Trigger Area */}
                {!isSearchMode &&
                  albums.length < totalItems &&
                  !isLoadingMore && (
                    <div className="p-8 text-center text-gray-500">
                      <p>Scroll down to load more albums</p>
                      <p className="text-sm mt-1">
                        {albums.length} of {totalItems} loaded
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton Card Component
function SkeletonCard() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="aspect-square bg-gray-600 rounded-lg"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-600 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-3/4"></div>
      </div>
    </div>
  );
}

// Album Card Component
interface AlbumCardProps {
  album: MusicItem;
}

function AlbumCard({ album }: AlbumCardProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (album.ImageTags && Object.keys(album.ImageTags).length > 0) {
        const url = await JellyfinApiService.getImageUrl(album.Id, "Primary");
        if (url) setImageUrl(url);
      }
    };
    loadImage();
  }, [album.Id]);

  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-square mb-3">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={album.Name}
            className="w-full h-full object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow"
            onError={() => setImageError(true)}
          />
        ) : (
          <ImagePlaceholder type="album" size="large" />
        )}
        <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>

        {/* Album track count overlay */}
        {album.ChildCount && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {album.ChildCount} songs
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="font-medium text-white truncate group-hover:text-red-300 transition-colors">
          {album.Name}
        </h3>
        <p className="text-sm text-gray-400 truncate">{getArtistName(album)}</p>
        {album.ProductionYear && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{album.ProductionYear}</span>
            {album.ChildCount && <span>•</span>}
          </div>
        )}
        {album.ChildCount && (
          <p className="text-xs text-gray-500">
            {album.ChildCount} track{album.ChildCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
