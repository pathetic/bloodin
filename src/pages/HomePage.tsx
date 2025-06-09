import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { JellyfinApiService } from "../services/jellyfinApi";
import { cacheService } from "../services/cacheService";
import {
  IconMusic,
  IconDisc,
  IconMicrophone,
  IconPlaylist,
  IconPlayerPlay,
  IconRefresh,
} from "@tabler/icons-react";
import type { MusicItem } from "../types/jellyfin";
import { formatDuration, getArtistName } from "../types/jellyfin";
import ImagePlaceholder from "../components/ImagePlaceholder";
import type { NavigationPage } from "../types";
import type { Song } from "../types";

interface HomePageProps {
  onPageChange?: (page: NavigationPage) => void;
}

export default function HomePage({ onPageChange }: HomePageProps = {}) {
  const { userName } = useAuth();
  const audioPlayer = useAudioPlayer();
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
      <div className="absolute top-0 left-0 right-0 z-10 p-6 space-y-6 bg-black/15 backdrop-blur-md border-b border-white/10">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {userName || "Music Lover"}! 🎵
          </h1>
          <p className="text-gray-400">Your music library is ready to play</p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAccessCard
            icon={<IconMusic size={24} />}
            title="Songs"
            subtitle={
              isLoading ? "Loading..." : `${totalSongs.toLocaleString()} songs`
            }
            color="from-red-500 to-red-700"
            onClick={() => onPageChange?.("songs")}
          />
          <QuickAccessCard
            icon={<IconDisc size={24} />}
            title="Albums"
            subtitle={
              isLoading
                ? "Loading..."
                : `${totalAlbums.toLocaleString()} albums`
            }
            color="from-amber-500 to-orange-600"
            onClick={() => onPageChange?.("albums")}
          />
          <QuickAccessCard
            icon={<IconMicrophone size={24} />}
            title="Artists"
            subtitle="Coming soon"
            color="from-purple-600 to-purple-800"
          />
          <QuickAccessCard
            icon={<IconPlaylist size={24} />}
            title="Playlists"
            subtitle="Coming soon"
            color="from-blue-600 to-blue-800"
          />
        </div>
      </div>

      {/* Scrollable Content - Full Height */}
      <div className="h-full overflow-auto pt-60 p-6 space-y-8 relative z-0 no-scrollbar">
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={`song-skeleton-${i}`}
                    className="space-y-3 animate-pulse"
                  >
                    <div className="aspect-square bg-gray-600 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-600 rounded"></div>
                      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recentSongs.slice(0, 12).map((song) => (
                  <SongCard key={song.Id} song={song} />
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
                  <RecentlyPlayedSongRow
                    key={`${song.id}-${index}`}
                    song={song}
                    index={index}
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={`album-skeleton-${i}`}
                    className="space-y-3 animate-pulse"
                  >
                    <div className="aspect-square bg-gray-600 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-600 rounded"></div>
                      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recentAlbums.slice(0, 12).map((album) => (
                  <AlbumCard key={album.Id} album={album} />
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

// Quick Access Card Component
interface QuickAccessCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  onClick?: () => void;
}

function QuickAccessCard({
  icon,
  title,
  subtitle,
  color,
  onClick,
}: QuickAccessCardProps) {
  return (
    <div
      className={`relative bg-gradient-to-br ${color} bg-opacity-30 backdrop-blur-md rounded-xl p-4 cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl group overflow-hidden`}
      onClick={onClick}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 rounded-xl"></div>

      {/* Border highlight */}
      <div className="absolute inset-0 rounded-xl border border-white/20 group-hover:border-white/30 transition-colors duration-300"></div>

      {/* Content */}
      <div className="relative flex items-center space-x-3 z-10">
        <div className="text-white drop-shadow-lg">{icon}</div>
        <div>
          <h3 className="font-semibold text-white drop-shadow-md">{title}</h3>
          <p className="text-white/90 text-sm drop-shadow-sm">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// Song Card Component
interface SongCardProps {
  song: MusicItem;
}

function SongCard({ song }: SongCardProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState(false);
  const audioPlayer = useAudioPlayer();

  useEffect(() => {
    const loadImage = async () => {
      const url = await JellyfinApiService.getImageUrl(song.Id, "Primary");
      if (url) setImageUrl(url);
    };
    loadImage();
  }, [song.Id]);

  const handlePlaySong = async () => {
    try {
      await audioPlayer.playSong(song.Id);
    } catch (error) {
      console.error("Failed to play song:", error);
    }
  };

  return (
    <div className="space-y-3 cursor-pointer group" onClick={handlePlaySong}>
      <div className="relative aspect-square">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={song.Name}
            className="w-full h-full object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow"
            onError={() => setImageError(true)}
          />
        ) : (
          <ImagePlaceholder type="song" size="large" />
        )}
        <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <IconPlayerPlay size={24} className="text-white" />
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="font-medium text-white truncate">{song.Name}</h4>
        <p className="text-sm text-gray-400 truncate">{getArtistName(song)}</p>
        {song.Album && (
          <p className="text-xs text-gray-500 truncate">{song.Album}</p>
        )}
        <p className="text-xs text-gray-500">
          {formatDuration(song.RunTimeTicks)}
        </p>
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
      const url = await JellyfinApiService.getImageUrl(album.Id, "Primary");
      if (url) setImageUrl(url);
    };
    loadImage();
  }, [album.Id]);

  return (
    <div className="space-y-3 cursor-pointer group">
      <div className="relative aspect-square">
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
      </div>
      <div className="space-y-1">
        <h4 className="font-medium text-white truncate">{album.Name}</h4>
        <p className="text-sm text-gray-400 truncate">{getArtistName(album)}</p>
        {album.ProductionYear && (
          <p className="text-xs text-gray-500">{album.ProductionYear}</p>
        )}
      </div>
    </div>
  );
}

// Recently Played Song Row Component
interface RecentlyPlayedSongRowProps {
  song: Song;
  index: number;
}

function RecentlyPlayedSongRow({ song, index }: RecentlyPlayedSongRowProps) {
  const audioPlayer = useAudioPlayer();

  const handlePlaySong = async () => {
    try {
      await audioPlayer.playSong(song.id);
    } catch (error) {
      console.error("Failed to play song:", error);
    }
  };

  const isCurrentSong = audioPlayer.state.currentSong?.id === song.id;

  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer group transition-colors ${
        isCurrentSong ? "bg-red-500/10 hover:bg-red-500/15" : "hover:bg-white/5"
      }`}
      onClick={handlePlaySong}
    >
      <div className="w-8 text-center">
        <span
          className={`text-sm ${
            isCurrentSong
              ? "text-red-400 font-bold"
              : "text-gray-400 group-hover:hidden"
          }`}
        >
          {index + 1}
        </span>
        <button
          className={`p-1 rounded-full hover:bg-red-500 transition-colors ${
            isCurrentSong
              ? "text-red-400"
              : "text-white hidden group-hover:block"
          }`}
        >
          <IconPlayerPlay size={14} />
        </button>
      </div>

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
            isCurrentSong ? "text-red-300" : "text-white"
          }`}
        >
          {song.title}
        </h4>
        <p className="text-sm text-gray-400 truncate">
          {song.artist} {song.album && `• ${song.album}`}
        </p>
      </div>
    </div>
  );
}
