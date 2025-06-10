import React, { useState, useEffect } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import { JellyfinApiService } from "../services/jellyfinApi";
import ImagePlaceholder from "./ImagePlaceholder";
import ArtistLinks from "./ArtistLinks";
import type { MusicItem } from "../types/jellyfin";

interface AlbumCardProps {
  album: MusicItem;
  showTrackCount?: boolean;
  showYear?: boolean;
  onClick?: (album: MusicItem) => void;
  onArtistClick?: (artistId: string, artistName: string) => void;
}

export default function AlbumCard({
  album,
  showTrackCount = true,
  showYear = true,
  onClick,
  onArtistClick,
}: AlbumCardProps) {
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
  }, [album.Id, album.ImageTags]);

  const handleClick = () => {
    if (onClick) {
      onClick(album);
    }
  };

  return (
    <div className="group cursor-pointer" onClick={handleClick}>
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
        <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <IconExternalLink size={24} className="text-white" />
        </div>

        {/* Album track count overlay */}
        {showTrackCount && album.ChildCount && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {album.ChildCount} songs
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="font-medium text-base-content truncate transition-colors">
          {album.Name}
        </h3>
        <ArtistLinks
          item={album}
          onArtistClick={onArtistClick}
          className="block text-sm text-gray-400 truncate"
        />

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {showYear && album.ProductionYear && (
            <>
              <span>{album.ProductionYear}</span>
              {showTrackCount && album.ChildCount && <span>•</span>}
            </>
          )}
          {showTrackCount && album.ChildCount && (
            <span>
              {album.ChildCount} track{album.ChildCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
