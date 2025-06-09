import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import PlayerBar from "./PlayerBar";
import FullscreenPlayer from "./FullscreenPlayer";
import { NavigationPage } from "../types";
import { useAudioPlayer } from "../contexts/AudioPlayerContext";
import { IconMusic, IconMinimize } from "@tabler/icons-react";
// import { IconSearch, IconMoon, IconBell } from "@tabler/icons-react";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: NavigationPage;
  onPageChange: (page: NavigationPage) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentPage,
  onPageChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState(() => {
    // Load saved position or default to bottom-left
    try {
      const saved = localStorage.getItem("bloodin_floating_image_position");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load image position:", error);
    }
    return { corner: "bottom-left" };
  });
  const audioPlayer = useAudioPlayer();

  const handleFullscreen = () => {
    setIsFullscreen(true);
  };

  const handleExitFullscreen = () => {
    setIsFullscreen(false);
  };

  const getCornerPosition = (corner: string) => {
    const margin = "8"; // 32px margin - better padding from edges
    const bottomMargin = "20"; // 80px from bottom - closer to PlayerBar but not overlapping

    let position;
    switch (corner) {
      case "top-left":
        position = `top-4 left-4`;
        break;
      case "top-right":
        position = `top-4 right-4`;
        break;
      case "bottom-left":
        position = `bottom-4 left-4`;
        break;
      case "bottom-right":
        position = `bottom-4 right-4`;
        break;
      default:
        position = `bottom-4 left-4`;
    }

    console.log(`🎯 Generated CSS classes for ${corner}:`, position);
    return position;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCollapsed || !isImageExpanded) return;

    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    // Update both state and ref immediately
    setIsDragging(true);
    isDraggingRef.current = true;
    setDragOffset(offset);
    dragOffsetRef.current = offset;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    e.preventDefault();

    // Calculate position relative to viewport
    const x = e.clientX - dragOffsetRef.current.x;
    const y = e.clientY - dragOffsetRef.current.y;

    // Update position immediately during drag
    const draggedElement = document.getElementById("floating-album-art");
    if (draggedElement) {
      draggedElement.style.position = "absolute";
      draggedElement.style.left = `${x}px`;
      draggedElement.style.top = `${y}px`;
      draggedElement.style.bottom = "auto";
      draggedElement.style.right = "auto";
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    // Update both state and ref immediately
    setIsDragging(false);
    isDraggingRef.current = false;

    // Get the main content area boundaries
    const contentArea = document.querySelector(
      ".flex-1.flex.flex-col.overflow-hidden.relative"
    );
    if (!contentArea) {
      console.log("❌ Content area not found");
      return;
    }

    const contentRect = contentArea.getBoundingClientRect();
    const sidebarWidth = isCollapsed ? 64 : 256; // Collapsed vs expanded sidebar width

    // Calculate position relative to content area
    const x = e.clientX - dragOffsetRef.current.x - sidebarWidth;
    const y = e.clientY - dragOffsetRef.current.y;

    const contentWidth = contentRect.width;
    const contentHeight = contentRect.height;

    // Make bottom detection much easier - bottom 40% of space for bottom corners
    const bottomThreshold = contentHeight * 0.6; // Top 60% for top corners, bottom 40% for bottom corners

    // Determine which corner is closest within content area
    const isLeft = x < contentWidth / 2;
    const isTop = y < bottomThreshold;

    let newCorner;
    if (isTop && isLeft) {
      newCorner = "top-left";
    } else if (isTop && !isLeft) {
      newCorner = "top-right";
    } else if (!isTop && isLeft) {
      newCorner = "bottom-left";
    } else {
      newCorner = "bottom-right";
    }

    console.log(`🎯 Detected corner: ${newCorner}`);

    // Save the new position
    const newPosition = { corner: newCorner };
    setImagePosition(newPosition);
    localStorage.setItem(
      "bloodin_floating_image_position",
      JSON.stringify(newPosition)
    );

    // Reset the element's style to use CSS classes
    const draggedElement = document.getElementById("floating-album-art");
    if (draggedElement) {
      draggedElement.style.position = "";
      draggedElement.style.left = "";
      draggedElement.style.top = "";
      draggedElement.style.bottom = "";
      draggedElement.style.right = "";
    }

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* Fullscreen Player - Rendered separately when active */}
      {isFullscreen && audioPlayer.state.currentSong && (
        <FullscreenPlayer
          currentSong={audioPlayer.state.currentSong}
          isPlaying={audioPlayer.state.isPlaying}
          progress={audioPlayer.state.progress}
          duration={audioPlayer.state.duration}
          volume={audioPlayer.state.volume}
          isShuffled={audioPlayer.state.isShuffled}
          repeatMode={audioPlayer.state.repeatMode}
          isSeeking={audioPlayer.state.isSeeking}
          onPlayPause={audioPlayer.playPause}
          onNext={audioPlayer.nextTrack}
          onPrevious={audioPlayer.previousTrack}
          onSeek={audioPlayer.seekTo}
          onVolumeChange={audioPlayer.setVolume}
          onShuffle={audioPlayer.toggleShuffle}
          onRepeat={audioPlayer.toggleRepeat}
          onStartSeeking={audioPlayer.startSeeking}
          onStopSeeking={audioPlayer.stopSeeking}
          onExit={handleExitFullscreen}
        />
      )}

      {/* Regular App Layout - Hidden when fullscreen */}
      {!isFullscreen && (
        <div className="h-screen  flex flex-col relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-700 rounded-full mix-blend-multiply filter blur-xl opacity-10"></div>
          </div>

          {/* Main content container - takes full height minus player bar */}
          <div className="flex-1 flex relative z-10 min-h-0">
            {/* Sidebar */}
            <Sidebar
              currentPage={currentPage}
              onPageChange={onPageChange}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
              isImageExpanded={isImageExpanded && !isCollapsed}
              onImageCollapse={() => setIsImageExpanded(false)}
              currentSong={audioPlayer.state.currentSong}
            />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Floating Expanded Album Art - When sidebar is collapsed - INSIDE CONTENT AREA */}
              {isImageExpanded &&
                isCollapsed &&
                audioPlayer.state.currentSong && (
                  <div
                    id="floating-album-art"
                    className={`absolute ${getCornerPosition(
                      imagePosition.corner
                    )} z-50 w-64 h-64`}
                  >
                    <div
                      className={`relative w-full h-full rounded-xl overflow-hidden shadow-2xl group backdrop-blur-sm select-none ${
                        isDragging
                          ? "cursor-grabbing scale-105 shadow-3xl"
                          : "cursor-grab"
                      } transition-all duration-200`}
                      onMouseDown={handleMouseDown}
                    >
                      {audioPlayer.state.currentSong.albumArt ? (
                        <img
                          src={audioPlayer.state.currentSong.albumArt}
                          alt={audioPlayer.state.currentSong.album}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                          <IconMusic size={80} className="text-white" />
                        </div>
                      )}
                      {/* Overlay with song info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                        <h3 className="text-white font-medium text-base truncate">
                          {audioPlayer.state.currentSong.title}
                        </h3>
                        <p className="text-gray-200 text-sm truncate">
                          {audioPlayer.state.currentSong.artist}
                        </p>
                        {audioPlayer.state.currentSong.album && (
                          <p className="text-gray-300 text-xs truncate">
                            {audioPlayer.state.currentSong.album}
                          </p>
                        )}
                      </div>
                      {/* Close button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsImageExpanded(false);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="cursor-pointer absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <IconMinimize size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                )}

              {/* Page content - takes remaining space and scrolls */}
              <div className="flex-1 overflow-auto pb-2">{children}</div>
            </div>
          </div>

          {/* Player bar - Fixed at bottom with proper z-index */}
          <div className="flex-shrink-0 relative z-20">
            <PlayerBar
              currentSong={audioPlayer.state.currentSong}
              isPlaying={audioPlayer.state.isPlaying}
              progress={audioPlayer.state.progress}
              duration={audioPlayer.state.duration}
              volume={audioPlayer.state.volume}
              isShuffled={audioPlayer.state.isShuffled}
              repeatMode={audioPlayer.state.repeatMode}
              isSeeking={audioPlayer.state.isSeeking}
              isImageExpanded={isImageExpanded}
              onImageExpand={() => setIsImageExpanded(true)}
              onPlayPause={audioPlayer.playPause}
              onNext={audioPlayer.nextTrack}
              onPrevious={audioPlayer.previousTrack}
              onSeek={audioPlayer.seekTo}
              onVolumeChange={audioPlayer.setVolume}
              onShuffle={audioPlayer.toggleShuffle}
              onRepeat={audioPlayer.toggleRepeat}
              onStartSeeking={audioPlayer.startSeeking}
              onStopSeeking={audioPlayer.stopSeeking}
              onFullscreen={handleFullscreen}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Layout;
