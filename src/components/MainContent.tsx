import React, { useState } from "react";
import HomePage from "../pages/HomePage";
import SongsPage from "../pages/SongsPage";
import AlbumsPage from "../pages/AlbumsPage";
import DetailView from "./DetailView";
import type { NavigationPage } from "../types";

interface DetailViewState {
  type: "album" | "artist" | "playlist";
  id: string;
  name: string;
}

interface MainContentProps {
  currentPage: NavigationPage;
}

export default function MainContent({ currentPage }: MainContentProps) {
  const [detailView, setDetailView] = useState<DetailViewState | null>(null);

  const handleAlbumClick = (album: any) => {
    setDetailView({
      type: "album",
      id: album.Id,
      name: album.Name,
    });
  };

  const handleArtistClick = (artistId: string, artistName: string) => {
    setDetailView({
      type: "artist",
      id: artistId,
      name: artistName,
    });
  };

  const handleBackToPage = () => {
    setDetailView(null);
  };

  // If we're showing a detail view, render that instead
  if (detailView) {
    return (
      <DetailView
        type={detailView.type}
        id={detailView.id}
        name={detailView.name}
        onBack={handleBackToPage}
        onArtistClick={handleArtistClick}
      />
    );
  }

  // Otherwise render the current page
  switch (currentPage) {
    case "home":
      return (
        <HomePage
          onAlbumClick={handleAlbumClick}
          onArtistClick={handleArtistClick}
        />
      );
    case "songs":
      return <SongsPage onArtistClick={handleArtistClick} />;
    case "albums":
      return (
        <AlbumsPage
          onAlbumClick={handleAlbumClick}
          onArtistClick={handleArtistClick}
        />
      );
    case "artists":
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Artists</h1>
          <p className="text-gray-400">Artists page coming soon...</p>
        </div>
      );
    case "playlists":
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Playlists</h1>
          <p className="text-gray-400">Playlists page coming soon...</p>
        </div>
      );
    case "search":
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Search</h1>
          <p className="text-gray-400">Search page coming soon...</p>
        </div>
      );
    case "settings":
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
          <p className="text-gray-400">Settings page coming soon...</p>
        </div>
      );
    default:
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Page Not Found</h1>
          <p className="text-gray-400">The requested page was not found.</p>
        </div>
      );
  }
}
