import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import SongsPage from "./pages/SongsPage";
import AlbumsPage from "./pages/AlbumsPage";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { NavigationPage } from "./types";

// Placeholder components for other pages (to be implemented later)
const ArtistsPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-white mb-4">Artists</h1>
    <p className="text-gray-400">Artists page coming soon...</p>
  </div>
);

const PlaylistsPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-white mb-4">Playlists</h1>
    <p className="text-gray-400">Playlists page coming soon...</p>
  </div>
);

const SearchPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-white mb-4">Search</h1>
    <p className="text-gray-400">Search page coming soon...</p>
  </div>
);

const SettingsPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-white mb-4">Settings</h1>
    <p className="text-gray-400">Settings page coming soon...</p>
  </div>
);

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavigationPage>("home");

  const handlePageChange = (page: NavigationPage) => {
    setCurrentPage(page);
  };

  // Component mapping for navigation
  const pageComponents = {
    home: <HomePage onPageChange={handlePageChange} />,
    songs: <SongsPage />,
    albums: <AlbumsPage />,
    artists: <ArtistsPage />,
    playlists: <PlaylistsPage />,
    search: <SearchPage />,
    settings: <SettingsPage />,
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-red-500 mb-4"></div>
          <p className="text-red-200">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <AudioPlayerProvider>
      <Layout currentPage={currentPage} onPageChange={handlePageChange}>
        {pageComponents[currentPage]}
      </Layout>
    </AudioPlayerProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
