import { useState, useEffect } from "react";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { JellyfinApiService } from "../services/jellyfinApi";
import ImagePlaceholder from "./ImagePlaceholder";
import ArtistLinks from "./ArtistLinks";
import type { MusicItem } from "../types/jellyfin";
import { formatDuration } from "../types/jellyfin";

interface SongCardProps {
  song: MusicItem;
  showDuration?: boolean;
  showAlbum?: boolean;
  onArtistClick?: (artistId: string, artistName: string) => void;
}

export default function SongCard({
  song,
  showDuration = true,
  showAlbum = true,
  onArtistClick,
}: SongCardProps) {
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

  const isCurrentSong = audioPlayer.state.currentSong?.id === song.Id;

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
        <div
          className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/40`}
        >
          <IconPlayerPlay size={24} className="text-white" />
        </div>

        {/* Current song indicator */}
        {isCurrentSong && (
          <div className="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </div>

      <div className="space-y-1">
        <h4
          className={`font-medium truncate ${
            isCurrentSong ? "text-red-500" : "text-base-content"
          }`}
        >
          {song.Name}
        </h4>
        <ArtistLinks
          item={song}
          onArtistClick={onArtistClick}
          className="block text-sm text-gray-400 truncate"
        />
        {showAlbum && song.Album && (
          <p className="text-xs text-gray-500 truncate">{song.Album}</p>
        )}
        {showDuration && (
          <p className="text-xs text-gray-500">
            {formatDuration(song.RunTimeTicks)}
          </p>
        )}
      </div>
    </div>
  );
}
