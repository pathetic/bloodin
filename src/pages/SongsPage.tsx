import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch, IconMusic } from "@tabler/icons-react";
import { JellyfinApiService } from "../services/jellyfinApi";
import type { MusicItem } from "../types/jellyfin";
import SongsTable from "../components/SongsTable";

export default function SongsPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<MusicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MusicItem[]>([]);
  const [totalSongs, setTotalSongs] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const BATCH_SIZE = 100;

  const handleArtistClick = (artistId: string, _artistName: string) => {
    navigate(`/artist/${artistId}`);
  };

  // Load initial batch and get total count
  const loadInitialSongs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await JellyfinApiService.getSongs(BATCH_SIZE, 0);
      if (response.success) {
        setSongs(response.items || []);
        setTotalSongs(response.total_count || 0);
        setHasMore((response.items?.length || 0) < (response.total_count || 0));
      }
    } catch (error) {
      console.error("Error loading songs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load more songs
  const loadMoreSongs = useCallback(async () => {
    if (isLoadingMore || !hasMore || searchTerm.trim()) return;

    setIsLoadingMore(true);
    try {
      const response = await JellyfinApiService.getSongs(
        BATCH_SIZE,
        songs.length
      );
      if (response.success && response.items) {
        setSongs((prev) => [...prev, ...response.items!]);
        setHasMore(songs.length + response.items.length < totalSongs);
      }
    } catch (error) {
      console.error("Error loading more songs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, searchTerm, songs.length, totalSongs]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 200; // Load more when 200px from bottom

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMoreSongs();
    }
  }, [loadMoreSongs]);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchTerm.trim()) {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Initialize
  useEffect(() => {
    loadInitialSongs();
  }, [loadInitialSongs]);

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Display data
  const isSearchMode = searchTerm.trim() !== "";
  const displayItems = isSearchMode ? searchResults : songs;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 bg-black/15 backdrop-blur-md border-b border-white/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-base-content">Songs</h1>
            <p className="text-base-content/60 mt-1">
              {isSearchMode
                ? `${searchResults.length} song${
                    searchResults.length !== 1 ? "s" : ""
                  } found`
                : `${songs.length} of ${totalSongs} song${
                    totalSongs !== 1 ? "s" : ""
                  } loaded`}
            </p>
          </div>

          <form onSubmit={handleSearch} className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="Search songs..."
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

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <SongsTable
            songs={[]}
            isLoading={true}
            loadingRows={10}
            onArtistClick={handleArtistClick}
            showAlbumColumn={true}
            showArtistInTitle={true}
          />
        ) : displayItems.length === 0 ? (
          <div className="h-full flex items-center justify-center px-6">
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
          <div ref={scrollContainerRef} className="h-full overflow-auto">
            <SongsTable
              songs={displayItems}
              onArtistClick={handleArtistClick}
              showAlbumColumn={true}
              showArtistInTitle={true}
            />

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="p-6 text-center">
                <div className="flex items-center justify-center space-x-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm">Loading more songs...</span>
                </div>
              </div>
            )}

            {/* End indicator */}
            {!hasMore && !isSearchMode && songs.length > 0 && (
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
