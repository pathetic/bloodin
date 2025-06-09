import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MainContent from "./components/MainContent";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { NavigationPage } from "./types";

// All page components are now handled in MainContent

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavigationPage>("home");

  const handlePageChange = (page: NavigationPage) => {
    setCurrentPage(page);
  };

  // No longer needed - MainContent handles all pages

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
        <MainContent currentPage={currentPage} />
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
