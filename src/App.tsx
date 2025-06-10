import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import SongsPage from "./pages/SongsPage";
import AlbumsPage from "./pages/AlbumsPage";
import SettingsPage from "./pages/SettingsPage";
import DetailView from "./components/DetailView";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Load saved theme on app startup
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // Set default theme if none saved
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-red-500 mb-4"></div>
          <p className="text-base-content/60">Loading...</p>
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
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/songs" element={<SongsPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Detail view routes */}
          <Route path="/album/:id" element={<DetailView type="album" />} />
          <Route path="/artist/:id" element={<DetailView type="artist" />} />
          <Route
            path="/playlist/:id"
            element={<DetailView type="playlist" />}
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
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
