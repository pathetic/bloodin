import React from "react";

interface ClickableArtistsProps {
  artistString: string;
  artistIds?: string[];
  onArtistClick?: (artistId: string, artistName: string) => void;
  className?: string;
}

const ClickableArtists: React.FC<ClickableArtistsProps> = ({
  artistString,
  artistIds,
  onArtistClick,
  className = "",
}) => {
  if (!onArtistClick || !artistIds || artistIds.length === 0) {
    return <span className={className}>{artistString}</span>;
  }

  // Split artist string by " & " to get individual artist names
  const artistNames = artistString.split(" & ");

  // If we have mismatched counts, fall back to non-clickable display
  if (artistNames.length !== artistIds.length) {
    return <span className={className}>{artistString}</span>;
  }

  return (
    <span className={className}>
      {artistNames.map((artistName, index) => (
        <React.Fragment key={artistIds[index]}>
          <span
            className="hover:text-red-400 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onArtistClick(artistIds[index], artistName.trim());
            }}
          >
            {artistName.trim()}
          </span>
          {index < artistNames.length - 1 && " & "}
        </React.Fragment>
      ))}
    </span>
  );
};

export default ClickableArtists;
