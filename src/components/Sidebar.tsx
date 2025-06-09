import React from "react";
import { NavigationPage, Song } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  IconHome,
  IconMusic,
  IconDisc,
  IconMicrophone,
  IconPlaylist,
  IconSettings,
  IconMenu2,
  IconX,
  IconChevronsLeft,
  IconPlayerPlay,
  IconLogout,
  IconChevronsRight,
  IconMinimize,
} from "@tabler/icons-react";

interface SidebarProps {
  currentPage: NavigationPage;
  onPageChange: (page: NavigationPage) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isImageExpanded?: boolean;
  onImageCollapse?: () => void;
  currentSong?: Song;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  isCollapsed = false,
  onToggleCollapse,
  isImageExpanded = false,
  onImageCollapse,
  currentSong,
}) => {
  const { userName, serverName, serverUrl, logout } = useAuth();

  // Helper function to format server URL for display
  const formatServerUrl = (url?: string): string => {
    if (!url) return "Unknown Server";

    try {
      const urlObj = new URL(url);
      // Return just the hostname and port (if not default)
      if (urlObj.port && !["80", "443", "8096"].includes(urlObj.port)) {
        return `${urlObj.hostname}:${urlObj.port}`;
      }
      return urlObj.hostname;
    } catch {
      // If URL parsing fails, try to extract manually
      const cleanUrl = url.replace(/^https?:\/\//, "");
      return cleanUrl.split("/")[0];
    }
  };

  const handleLogout = async () => {
    await logout();
  };
  const navItems = [
    {
      id: "home" as NavigationPage,
      label: "Home",
      icon: <IconHome size={20} />,
    },
    {
      id: "songs" as NavigationPage,
      label: "Songs",
      icon: <IconMusic size={20} />,
    },
    {
      id: "albums" as NavigationPage,
      label: "Albums",
      icon: <IconDisc size={20} />,
    },
    {
      id: "artists" as NavigationPage,
      label: "Artists",
      icon: <IconMicrophone size={20} />,
    },
    {
      id: "playlists" as NavigationPage,
      label: "Playlists",
      icon: <IconPlaylist size={20} />,
    },
  ];

  const bottomNavItems = [
    {
      id: "settings" as NavigationPage,
      label: "Settings",
      icon: <IconSettings size={20} />,
    },
  ];

  return (
    <div
      className={`h-full backdrop-blur-xl bg-black/20 border-r border-white/10 transition-all duration-300 flex-shrink-0 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div
        className={`flex flex-col h-full ${
          isCollapsed ? "p-2" : "p-4"
        } overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`flex items-center mb-8 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
                <IconPlayerPlay size={16} className="text-white" />
              </div>
              <span className="text-lg font-semibold text-white">Bloodin</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className={`${
              isCollapsed ? "p-3" : "p-2"
            } cursor-pointer rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-200`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <IconChevronsRight size={20} />
            ) : (
              <IconChevronsLeft size={20} />
            )}
          </button>
        </div>

        {/* Navigation - scrollable if needed */}
        <nav className="flex-1 space-y-2 overflow-y-auto min-h-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex items-center w-full cursor-pointer ${
                isCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
              } rounded-xl transition-all duration-200 group ${
                currentPage === item.id
                  ? "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span
                className={`${
                  currentPage === item.id
                    ? "text-white"
                    : "text-gray-400 group-hover:text-white"
                }`}
              >
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="ml-3 font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom section - fixed at bottom */}
        <div className="flex-shrink-0 space-y-4 mt-4">
          {/* Bottom Navigation */}
          <div className="space-y-2">
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex items-center w-full cursor-pointer ${
                  isCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
                } rounded-xl transition-all duration-200 group ${
                  currentPage === item.id
                    ? "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span
                  className={`${
                    currentPage === item.id
                      ? "text-white"
                      : "text-gray-400 group-hover:text-white"
                  }`}
                >
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="ml-3 font-medium">{item.label}</span>
                )}
              </button>
            ))}
          </div>

          {/* User Profile */}
          {isCollapsed ? (
            <div className="space-y-2">
              <div className="flex justify-center">
                <div
                  className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center border-2 border-green-400"
                  title={`${userName || "User"} - ${
                    serverName || "Server"
                  } (${formatServerUrl(serverUrl)})`}
                >
                  <span className="text-sm font-semibold text-white">
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-all duration-200"
                  title="Logout"
                >
                  <IconLogout size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {userName ? userName.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                  <div>
                    <p className="flex flex-row items-center gap-1 text-sm font-medium text-white">
                      {userName || "User"}{" "}
                      <span className="text-xs text-gray-400">
                        ({serverName || "Connected"})
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatServerUrl(serverUrl)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-all duration-200"
                  title="Logout"
                >
                  <IconLogout size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Expanded Album Art - Below user info */}
          {isImageExpanded && !isCollapsed && currentSong && (
            <div className="w-full">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl group">
                {currentSong.albumArt ? (
                  <img
                    src={currentSong.albumArt}
                    alt={currentSong.album}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                    <IconMusic size={80} className="text-white" />
                  </div>
                )}
                <button
                  onClick={onImageCollapse}
                  className="cursor-pointer absolute top-1 right-1 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-all duration-200 opacity-0 group-hover:opacity-100"
                >
                  <IconMinimize size={16} className="text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
