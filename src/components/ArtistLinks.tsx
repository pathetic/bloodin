import React from "react";
import type { MusicItem } from "../types/jellyfin";

interface ArtistLinksProps {
  item: MusicItem;
  onArtistClick?: (artistId: string, artistName: string) => void;
  className?: string;
}

export default function ArtistLinks({
  item,
  onArtistClick,
  className,
}: ArtistLinksProps) {
  const artists = item.ArtistItems || [];

  const handleArtistClick = (
    e: React.MouseEvent,
    artistId: string,
    artistName: string
  ) => {
    e.stopPropagation();
    if (onArtistClick) {
      onArtistClick(artistId, artistName);
    }
  };

  if (artists.length === 0) {
    return (
      <span className={className}>{item.AlbumArtist || "Unknown Artist"}</span>
    );
  }

  return (
    <span className={className}>
      {artists.map((artist, index) => (
        <React.Fragment key={artist.Id}>
          <a
            onClick={(e) => handleArtistClick(e, artist.Id, artist.Name)}
            className="hover:text-red-500 hover:underline cursor-pointer transition-colors"
          >
            {artist.Name}
          </a>
          {index < artists.length - 1 && ", "}
        </React.Fragment>
      ))}
    </span>
  );
}
