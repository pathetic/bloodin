import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IconDisc, IconSearch } from "@tabler/icons-react";
import { JellyfinApiService } from "../services/jellyfinApi";
import { cacheService } from "../services/cacheService";
import type { MusicItem } from "../types/jellyfin";
import AlbumCard from "../components/AlbumCard";
import { SkeletonGrid } from "../components/LoadingSkeleton";

export default function AlbumsPage() {
  const navigate = useNavigate();
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
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BATCH_SIZE = 24;
  const SCROLL_DEBOUNCE_MS = 200;

  const handleAlbumClick = (album: MusicItem) => {
    navigate(`/album/${album.Id}`);
  };

  const handleArtistClick = (artistId: string, artistName: string) => {
    navigate(`/artist/${artistId}`);
  };

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
              <h1 className="text-3xl font-bold text-base-content">Albums</h1>
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
                className="w-full bg-white/10 border border-base-content/40 rounded-xl px-4 py-2 pr-10 text-base-content placeholder-base-content/60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
              <SkeletonGrid count={12} />
            </div>
          ) : displayTotal === 0 ? (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center min-w-full min-h-full">
              <div className="text-center py-12">
                <IconDisc size={64} className="mx-auto text-gray-600 mb-4" />
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
                    <AlbumCard
                      key={album.Id}
                      album={album}
                      onClick={handleAlbumClick}
                      onArtistClick={handleArtistClick}
                    />
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
