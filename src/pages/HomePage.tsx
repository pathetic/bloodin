import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { JellyfinApiService } from "../services/jellyfinApi";
import { cacheService } from "../services/cacheService";
import { IconMusic, IconRefresh, IconDisc } from "@tabler/icons-react";
import type { MusicItem } from "../types/jellyfin";

import SongCard from "../components/SongCard";
import AlbumCard from "../components/AlbumCard";
import SongRow from "../components/SongRow";
import { SkeletonGrid } from "../components/LoadingSkeleton";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const { userName } = useAuth();
  const audioPlayer = useAudioPlayer();
  const navigate = useNavigate();
  const [recentSongs, setRecentSongs] = useState<MusicItem[]>([]);
  const [recentAlbums, setRecentAlbums] = useState<MusicItem[]>([]);
  const [totalSongs, setTotalSongs] = useState<number>(0);
  const [totalAlbums, setTotalAlbums] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingExplore, setIsRefreshingExplore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentlyPlayedSongs = audioPlayer.getRecentlyPlayed();

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first for recent songs
      const cachedSongs = cacheService.getRecentSongs();
      const cachedAlbums = cacheService.getRecentAlbums();

      if (cachedSongs && cachedAlbums) {
        console.log("📦 Using cached home data");
        setRecentSongs(cachedSongs.items);
        setTotalSongs(cachedSongs.total_count || 0);
        setRecentAlbums(cachedAlbums.items);
        setTotalAlbums(cachedAlbums.total_count || 0);
        setIsLoading(false);
        return;
      }

      // Load random songs for exploration and recently added albums, plus total counts
      const [randomSongsResult, recentAlbumsResult, totalSongsResult] =
        await Promise.all([
          JellyfinApiService.getRandomSongs(20),
          JellyfinApiService.getRecentAlbums(12, 0),
          JellyfinApiService.getSongs(1, 0), // Just to get total count
        ]);

      if (randomSongsResult.success && randomSongsResult.items) {
        console.log(
          "✅ Random songs loaded:",
          randomSongsResult.items.length,
          "songs"
        );
        setRecentSongs(randomSongsResult.items);

        // Use total from regular songs call for actual total count
        if (totalSongsResult.success) {
          setTotalSongs(totalSongsResult.total_count || 0);
        }

        // Cache the results (using existing cache structure)
        cacheService.setRecentSongs({
          success: true,
          items: randomSongsResult.items,
          total_count: totalSongsResult.total_count || 0,
          message: "Random songs loaded",
        });
      } else {
        console.error(
          "❌ Failed to load random songs:",
          randomSongsResult.message
        );
      }

      if (recentAlbumsResult.success && recentAlbumsResult.items) {
        console.log(
          "✅ Recent albums loaded:",
          recentAlbumsResult.items.length,
          "albums"
        );
        setRecentAlbums(recentAlbumsResult.items);
        setTotalAlbums(recentAlbumsResult.total_count || 0);

        // Cache the results
        cacheService.setRecentAlbums(recentAlbumsResult);
      } else {
        console.error(
          "❌ Failed to load recent albums:",
          recentAlbumsResult.message
        );
      }

      if (!randomSongsResult.success && !recentAlbumsResult.success) {
        setError("Failed to load music library data");
      }
    } catch (error) {
      console.error("Failed to load home data:", error);
      setError("Failed to load music library");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshExploreSongs = async () => {
    setIsRefreshingExplore(true);
    try {
      const randomSongsResult = await JellyfinApiService.getRandomSongs(20);

      if (randomSongsResult.success && randomSongsResult.items) {
        console.log(
          "🔄 Explore songs refreshed:",
          randomSongsResult.items.length,
          "songs"
        );
        setRecentSongs(randomSongsResult.items);

        // Update cache with new random songs
        cacheService.setRecentSongs({
          success: true,
          items: randomSongsResult.items,
          total_count: totalSongs, // Keep existing total count
          message: "Random songs refreshed",
        });
      } else {
        console.error(
          "❌ Failed to refresh explore songs:",
          randomSongsResult.message
        );
      }
    } catch (error) {
      console.error("Failed to refresh explore songs:", error);
    } finally {
      setIsRefreshingExplore(false);
    }
  };

  const handleAlbumClick = (album: MusicItem) => {
    navigate(`/album/${album.Id}`);
  };

  const handleArtistClick = (artistId: string, artistName: string) => {
    navigate(`/artist/${artistId}`);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error bg-red-500/20 border-red-500/30 text-red-200">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>{error}</span>
          <button onClick={loadHomeData} className="btn btn-sm btn-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Fixed Top Section - Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-black/15 backdrop-blur-md border-b border-white/10">
        {/* Welcome Header and Statistics */}
        <div className="flex items-center justify-between">
          {/* Welcome Text */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {userName || "Music Lover"}! 🎵
            </h1>
            <p className="text-gray-400">Your music library is ready to play</p>
          </div>

          {/* Statistics */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
              <div className="p-2 bg-red-500/30 rounded-lg">
                <IconMusic size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Songs</p>
                <p className="text-lg font-semibold text-white">
                  {isLoading ? "..." : totalSongs.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
              <div className="p-2 bg-orange-500/30 rounded-lg">
                <IconDisc size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Albums</p>
                <p className="text-lg font-semibold text-white">
                  {isLoading ? "..." : totalAlbums.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content - Full Height */}
      <div className="h-full overflow-auto pt-36 p-6 space-y-8 relative z-0 no-scrollbar">
        {/* Explore Songs */}
        {recentSongs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Explore Songs</h2>
              <button
                onClick={refreshExploreSongs}
                disabled={isRefreshingExplore}
                className="cursor-pointer flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="Refresh explore songs"
              >
                <IconRefresh
                  size={18}
                  className={`text-white ${
                    isRefreshingExplore ? "animate-spin" : ""
                  }`}
                />
                <span className="text-sm text-white">Refresh</span>
              </button>
            </div>
            {isLoading ? (
              <SkeletonGrid count={12} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recentSongs.slice(0, 12).map((song) => (
                  <SongCard
                    key={song.Id}
                    song={song}
                    onArtistClick={handleArtistClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recently Played */}
        {recentlyPlayedSongs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Recently Played</h2>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {recentlyPlayedSongs.slice(0, 20).map((song, index) => (
                  <SongRow
                    key={`${song.id}-${index}`}
                    song={song}
                    index={index + 1}
                    compact={true}
                    onArtistClick={handleArtistClick}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Albums */}
        {recentAlbums.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">
              Recently Added Albums
            </h2>
            {isLoading ? (
              <SkeletonGrid count={6} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recentAlbums.slice(0, 12).map((album) => (
                  <AlbumCard
                    key={album.Id}
                    album={album}
                    onClick={handleAlbumClick}
                    onArtistClick={handleArtistClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading &&
          recentSongs.length === 0 &&
          recentAlbums.length === 0 && (
            <div className="text-center py-12">
              <IconMusic size={64} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No music found
              </h3>
              <p className="text-gray-500">
                Your Jellyfin library appears to be empty. Add some music to get
                started!
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
