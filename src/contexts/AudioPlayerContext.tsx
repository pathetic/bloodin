import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  AudioPlayerAPI,
  convertBackendPlaybackState,
} from "../services/audioPlayerApi";
import { Song } from "../types";
import { JellyfinApiService } from "../services/jellyfinApi";
import { QueueManager } from "../services/queueManager";
import { QueueSource, QueueItem } from "../types/queue";

interface AudioPlayerState {
  currentSong?: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";
  isLoading: boolean;
  isSeeking: boolean;
}

interface AudioPlayerContextType {
  // State
  state: AudioPlayerState;
  queueVersion: number; // For triggering re-renders when queue changes

  // Actions
  playSong: (songId: string) => Promise<void>;
  playPause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  toggleRepeat: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  refreshState: () => Promise<void>;
  startSeeking: () => void;
  stopSeeking: () => void;

  // Queue management
  createQueueFromSource: (
    songs: Song[],
    source: QueueSource,
    shuffle?: boolean,
    startIndex?: number
  ) => Promise<void>;
  addToQueue: (song: Song, position?: "next" | "end") => void;
  removeFromQueue: (songId: string) => boolean;
  getQueue: () => QueueItem[];
  getQueueStats: () => {
    total: number;
    current: number;
    manual: number;
    source: QueueSource;
  };
  clearQueue: () => void;
  clearSavedQueue: () => void;
  jumpToSong: (songId: string) => Promise<void>;
  reorderQueue: (fromSongId: string, toIndex: number) => boolean;

  // Recently played
  getRecentlyPlayed: () => Song[];

  // Last session
  getLastPlayedSong: () => { song: Song; position: number } | null;
  resumeLastSong: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(
  undefined
);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error(
      "useAudioPlayer must be used within an AudioPlayerProvider"
    );
  }
  return context;
};

// Load cached volume or use default
const getCachedVolume = (): number => {
  try {
    const saved = localStorage.getItem("bloodin_volume");
    if (saved) {
      const volume = parseFloat(saved);
      // Ensure volume is within valid range
      if (volume >= 0 && volume <= 1) {
        return volume;
      }
    }
  } catch (error) {
    console.error("Failed to load cached volume:", error);
  }
  return 0.7; // Default volume
};

// Load initial state including saved shuffle/repeat from queue
const getInitialState = (): AudioPlayerState => {
  let isShuffled = false;
  let repeatMode: "none" | "one" | "all" = "none";

  // Try to load shuffle and repeat state from saved queue
  try {
    const saved = localStorage.getItem("bloodin_queue_state");
    const version = localStorage.getItem("bloodin_queue_version");

    if (saved && version === "1.0") {
      const parsedState = JSON.parse(saved);
      if (parsedState && typeof parsedState.isShuffled === "boolean") {
        isShuffled = parsedState.isShuffled;
      }
      if (
        parsedState &&
        ["none", "one", "all"].includes(parsedState.repeatMode)
      ) {
        repeatMode = parsedState.repeatMode;
      }
    }
  } catch (error) {
    console.error("Failed to load shuffle/repeat state:", error);
  }

  return {
    currentSong: undefined,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: getCachedVolume(),
    isShuffled,
    repeatMode,
    isLoading: false,
    isSeeking: false,
  };
};

const initialState: AudioPlayerState = getInitialState();

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AudioPlayerState>(initialState);
  const [queueVersion, setQueueVersion] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(() => {
    // Load recently played from localStorage
    try {
      const saved = localStorage.getItem("bloodin_recently_played");
      const version = localStorage.getItem("bloodin_recently_played_version");

      if (saved && version === "1.1") {
        const parsed = JSON.parse(saved);
        // Verify that all songs have artistIds (at least for new data structure)
        if (Array.isArray(parsed) && parsed.length === 0) {
          return parsed; // Empty array is fine
        }
        return parsed;
      } else {
        // Clear old data that doesn't have artist IDs
        console.log(
          "🔄 Migrating recently played songs - clearing old data without artist IDs"
        );
        localStorage.removeItem("bloodin_recently_played");
        localStorage.setItem("bloodin_recently_played_version", "1.1");
        return [];
      }
    } catch (error) {
      console.error("Failed to load recently played songs:", error);
      return [];
    }
  });

  const [lastPlayedSong, setLastPlayedSong] = useState<{
    song: Song;
    position: number;
  } | null>(() => {
    // Load last played song from localStorage
    try {
      const saved = localStorage.getItem("bloodin_last_played");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load last played song:", error);
    }
    return null;
  });

  // Cache for album art to prevent re-fetching the same image
  const albumArtCache = useRef<Map<string, string | undefined>>(new Map());
  const currentSongRef = useRef<Song | undefined>(undefined);
  const queueManager = useRef<QueueManager>(new QueueManager());
  const previousStateRef = useRef<{
    progress: number;
    duration: number;
    isPlaying: boolean;
  }>({ progress: 0, duration: 0, isPlaying: false });

  // Save recently played to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "bloodin_recently_played",
        JSON.stringify(recentlyPlayed)
      );
      localStorage.setItem("bloodin_recently_played_version", "1.1");
    } catch (error) {
      console.error("Failed to save recently played songs:", error);
    }
  }, [recentlyPlayed]);

  // Save last played song and position to localStorage
  useEffect(() => {
    if (state.currentSong && state.isPlaying && state.progress > 5) {
      // Only save if song is playing and has progressed more than 5 seconds
      const lastPlayed = {
        song: state.currentSong,
        position: state.progress,
      };

      try {
        localStorage.setItem("bloodin_last_played", JSON.stringify(lastPlayed));
        setLastPlayedSong(lastPlayed);
      } catch (error) {
        console.error("Failed to save last played song:", error);
      }
    }
  }, [state.currentSong, state.isPlaying, state.progress]);

  // Add song to recently played
  const addToRecentlyPlayed = useCallback((song: Song) => {
    setRecentlyPlayed((prev) => {
      // Remove if already exists to avoid duplicates
      const filtered = prev.filter((s) => s.id !== song.id);
      // Add to beginning and limit to 20 songs
      return [song, ...filtered].slice(0, 20);
    });
  }, []);

  // Helper function to enhance song data with album art
  const enhanceSongWithAlbumArt = useCallback(
    async (song: any): Promise<Song> => {
      let albumArt: string | undefined;

      // Check if we already have this album art cached
      if (albumArtCache.current.has(song.id)) {
        albumArt = albumArtCache.current.get(song.id);
      } else {
        try {
          // Try to get album art from the song
          const imageUrl = await JellyfinApiService.getImageUrl(
            song.id,
            "Primary"
          );
          albumArt = imageUrl || undefined;
          // Cache the result
          albumArtCache.current.set(song.id, albumArt);
        } catch (error) {
          console.log("Failed to get album art:", error);
          // Cache the failure too to avoid repeated requests
          albumArtCache.current.set(song.id, undefined);
        }
      }

      return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        albumArt,
        artistIds: song.artistIds, // Preserve artist IDs for navigation
      };
    },
    []
  );

  // Refresh state from backend
  const refreshState = useCallback(async () => {
    try {
      const backendState = await AudioPlayerAPI.getPlaybackState();
      const convertedState = convertBackendPlaybackState(backendState);

      let enhancedSong: Song | undefined;

      if (convertedState.currentSong) {
        // Check if the song has changed
        const songChanged =
          currentSongRef.current?.id !== convertedState.currentSong.id;

        if (songChanged) {
          // Song changed, fetch album art
          enhancedSong = await enhanceSongWithAlbumArt(
            convertedState.currentSong
          );
          currentSongRef.current = enhancedSong;

          // Add to recently played when song changes and is playing
          if (convertedState.isPlaying && enhancedSong) {
            addToRecentlyPlayed(enhancedSong);
          }
        } else {
          // Same song, reuse existing data but update with fresh backend data
          enhancedSong = currentSongRef.current
            ? {
                ...currentSongRef.current,
                // Update any properties that might change without changing the song
                title: convertedState.currentSong.title,
                artist: convertedState.currentSong.artist,
                album: convertedState.currentSong.album,
                duration: convertedState.currentSong.duration,
                artistIds: convertedState.currentSong.artistIds, // Preserve artist IDs
              }
            : await enhanceSongWithAlbumArt(convertedState.currentSong);
        }
      } else {
        // No current song
        enhancedSong = undefined;
        currentSongRef.current = undefined;
      }

      // console.log("🎵 Audio Player State Update:", {
      //   currentSong: enhancedSong?.title,
      //   isPlaying: convertedState.isPlaying,
      //   progress: convertedState.currentPosition,
      //   duration: convertedState.duration,
      //   volume: convertedState.volume,
      //   songChanged:
      //     currentSongRef.current?.id !== convertedState.currentSong?.id,
      // });

      setState((prev) => ({
        ...prev,
        currentSong: enhancedSong,
        isPlaying: convertedState.isPlaying,
        progress: convertedState.currentPosition,
        duration: convertedState.duration,
        volume: convertedState.volume,
        // Preserve frontend-managed shuffle and repeat state
        // isShuffled: convertedState.isShuffled,  // Don't override frontend queue state
        // repeatMode: convertedState.repeatMode,  // Don't override frontend queue state
      }));
    } catch (error) {
      console.error("Failed to refresh audio player state:", error);
    }
  }, [enhanceSongWithAlbumArt]);

  // Initialize state and backend volume on mount
  useEffect(() => {
    const initializePlayer = async () => {
      // Set the cached volume in the backend
      try {
        await AudioPlayerAPI.setVolume(initialState.volume);
        console.log(
          `🔊 Initialized volume to cached value: ${initialState.volume}`
        );
      } catch (error) {
        console.error("Failed to initialize volume:", error);
      }

      // Log restored shuffle and repeat state
      try {
        const queueState = queueManager.current.getState();
        if (queueState.currentOrder.length > 0) {
          console.log(
            `🔄 Restored queue with shuffle: ${queueState.isShuffled}, repeat: ${queueState.repeatMode}`
          );
        }
      } catch (error) {
        console.error("Failed to log restored state:", error);
      }

      // Refresh state to sync everything
      refreshState();
    };

    initializePlayer();
  }, [refreshState]);

  // Auto-refresh state every second when playing (but not when seeking)
  useEffect(() => {
    if (!state.isPlaying || state.isSeeking) return;

    const interval = setInterval(() => {
      refreshState();
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isPlaying, state.isSeeking, refreshState]);

  const playSong = useCallback(
    async (songId: string) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        console.log(`🎵 Playing song: ${songId}`);
        await AudioPlayerAPI.playSong(songId);

        // Refresh state to get updated playback info
        await refreshState();
      } catch (error) {
        console.error("Failed to play song:", error);
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [refreshState]
  );

  const playPause = useCallback(async () => {
    try {
      if (state.isPlaying) {
        await AudioPlayerAPI.pausePlayback();
      } else {
        // Check if the song has finished (progress equals or exceeds duration)
        const hasFinished =
          state.duration > 0 && state.progress >= state.duration;

        if (hasFinished && state.currentSong) {
          // Song has finished, restart from the beginning
          console.log("🎵 Song finished, restarting from beginning");
          await AudioPlayerAPI.seekTo(0);
          await AudioPlayerAPI.resumePlayback();
        } else {
          // Normal resume
          await AudioPlayerAPI.resumePlayback();
        }
      }
      await refreshState();
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  }, [
    state.isPlaying,
    state.duration,
    state.progress,
    state.currentSong,
    refreshState,
  ]);

  const stop = useCallback(async () => {
    try {
      await AudioPlayerAPI.stopPlayback();
      await refreshState();
    } catch (error) {
      console.error("Failed to stop playback:", error);
    }
  }, [refreshState]);

  const seekTo = useCallback(async (position: number) => {
    try {
      // Update UI immediately for responsive feedback
      setState((prev) => ({ ...prev, progress: position }));

      // Send seek command to backend
      await AudioPlayerAPI.seekTo(position);

      console.log(`Seeking to position: ${position} seconds`);
    } catch (error) {
      console.error("Failed to seek:", error);
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      await AudioPlayerAPI.setVolume(volume);
      setState((prev) => ({ ...prev, volume }));

      // Cache volume to localStorage
      try {
        localStorage.setItem("bloodin_volume", volume.toString());
      } catch (error) {
        console.error("Failed to cache volume:", error);
      }
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  }, []);

  const toggleShuffle = useCallback(async () => {
    try {
      const newShuffleState = queueManager.current.toggleShuffle();
      setState((prev) => ({ ...prev, isShuffled: newShuffleState }));
      console.log(`🎵 Shuffle ${newShuffleState ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to toggle shuffle:", error);
    }
  }, []);

  const toggleRepeat = useCallback(async () => {
    try {
      const modes: ("none" | "one" | "all")[] = ["none", "one", "all"];
      const currentIndex = modes.indexOf(state.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];

      queueManager.current.setRepeatMode(nextMode);
      setState((prev) => ({ ...prev, repeatMode: nextMode }));
      console.log(`🎵 Repeat mode: ${nextMode}`);
    } catch (error) {
      console.error("Failed to toggle repeat:", error);
    }
  }, [state.repeatMode]);

  const nextTrack = useCallback(async () => {
    try {
      const nextSong = queueManager.current.advanceToNext();
      if (nextSong) {
        console.log(`🎵 Next track: ${nextSong.title}`);
        await playSong(nextSong.id);

        // Sync UI state with queue manager state
        const queueState = queueManager.current.getState();
        setState((prev) => ({
          ...prev,
          isShuffled: queueState.isShuffled,
          repeatMode: queueState.repeatMode,
        }));

        setQueueVersion((prev) => prev + 1);
      } else {
        console.log("🎵 End of queue reached");
        await stop();
      }
    } catch (error) {
      console.error("Failed to go to next track:", error);
    }
  }, [playSong, stop]);

  const previousTrack = useCallback(async () => {
    try {
      const result = queueManager.current.getPreviousSong(state.progress);

      if (result.action === "restart") {
        console.log("🎵 Restarting current song");
        await seekTo(0);
      } else if (result.song) {
        console.log(`🎵 Previous track: ${result.song.title}`);
        await playSong(result.song.id);

        // Sync UI state with queue manager state
        const queueState = queueManager.current.getState();
        setState((prev) => ({
          ...prev,
          isShuffled: queueState.isShuffled,
          repeatMode: queueState.repeatMode,
        }));

        setQueueVersion((prev) => prev + 1);
      } else {
        console.log("🎵 No previous song available");
        await seekTo(0); // Just restart current song as fallback
      }
    } catch (error) {
      console.error("Failed to go to previous track:", error);
    }
  }, [state.progress, playSong, seekTo]);

  const startSeeking = useCallback(() => {
    setState((prev) => ({ ...prev, isSeeking: true }));
  }, []);

  const stopSeeking = useCallback(() => {
    setState((prev) => ({ ...prev, isSeeking: false }));
  }, []);

  const getRecentlyPlayed = useCallback(() => {
    return recentlyPlayed;
  }, [recentlyPlayed]);

  const getLastPlayedSong = useCallback(() => {
    return lastPlayedSong;
  }, [lastPlayedSong]);

  const resumeLastSong = useCallback(async () => {
    if (lastPlayedSong) {
      try {
        console.log(
          `🎵 Resuming last played song: ${lastPlayedSong.song.title} at ${lastPlayedSong.position}s`
        );
        await playSong(lastPlayedSong.song.id);

        // Wait a bit for the song to start, then seek to saved position
        setTimeout(() => {
          seekTo(lastPlayedSong.position);
        }, 1000);
      } catch (error) {
        console.error("Failed to resume last song:", error);
      }
    }
  }, [lastPlayedSong, playSong, seekTo]);

  // Queue management methods
  const createQueueFromSource = useCallback(
    async (
      songs: Song[],
      source: QueueSource,
      shuffle: boolean = false,
      startIndex: number = 0
    ) => {
      try {
        console.log(
          `🎵 Creating queue from ${source.type}:`,
          source.name || source.id
        );

        // Create the queue
        queueManager.current.createQueue(songs, source, shuffle, startIndex);

        // Start playing the first song in the queue
        const firstSong = queueManager.current.getCurrentSong();
        if (firstSong) {
          await playSong(firstSong.id);
        }

        // Update shuffle state to match queue
        setState((prev) => ({ ...prev, isShuffled: shuffle }));

        // Trigger re-render
        setQueueVersion((prev) => prev + 1);
      } catch (error) {
        console.error("Failed to create queue:", error);
      }
    },
    [playSong]
  );

  const addToQueue = useCallback(
    (song: Song, position: "next" | "end" = "end") => {
      queueManager.current.addToQueue(song, position);
      console.log(`🎵 Added "${song.title}" to queue (position: ${position})`);
      setQueueVersion((prev) => prev + 1);
    },
    []
  );

  const removeFromQueue = useCallback((songId: string): boolean => {
    const success = queueManager.current.removeFromQueue(songId);
    if (success) {
      console.log(`🎵 Removed song ${songId} from queue`);
      setQueueVersion((prev) => prev + 1);
    }
    return success;
  }, []);

  const getQueue = useCallback((): QueueItem[] => {
    return queueManager.current.getVisibleQueue();
  }, []);

  const getQueueStats = useCallback(() => {
    return queueManager.current.getQueueStats();
  }, []);

  const clearQueue = useCallback(() => {
    queueManager.current.clearQueue();
    console.log("🎵 Cleared queue");
    setQueueVersion((prev) => prev + 1);
  }, []);

  const clearSavedQueue = useCallback(() => {
    queueManager.current.clearSavedQueue();
    console.log("🎵 Cleared saved queue state");
  }, []);

  const jumpToSong = useCallback(
    async (songId: string) => {
      try {
        const targetSong = queueManager.current.jumpToSong(songId);
        if (targetSong) {
          console.log(`🎵 Jumping to song in queue: ${targetSong.title}`);
          await playSong(targetSong.id);

          // Sync UI state with queue manager state
          const queueState = queueManager.current.getState();
          setState((prev) => ({
            ...prev,
            isShuffled: queueState.isShuffled,
            repeatMode: queueState.repeatMode,
          }));

          setQueueVersion((prev) => prev + 1);
        } else {
          console.warn(`Song ${songId} not found in queue`);
          // Fallback to direct play if not in queue
          await playSong(songId);
        }
      } catch (error) {
        console.error("Failed to jump to song:", error);
      }
    },
    [playSong]
  );

  const reorderQueue = useCallback((fromSongId: string, toIndex: number) => {
    const success = queueManager.current.reorderQueue(fromSongId, toIndex);
    if (success) {
      console.log(`🎵 Reordered song ${fromSongId} to index ${toIndex}`);
      setQueueVersion((prev) => prev + 1);
    }
    return success;
  }, []);

  // Auto-advance to next track when current song ends
  useEffect(() => {
    const prevState = previousStateRef.current;

    // Detect if song just ended: was playing before, has valid duration, reached end, not playing now
    const songJustEnded =
      prevState.isPlaying && // Was playing before
      !state.isPlaying && // Not playing now
      state.duration > 0 && // Has a valid duration
      state.progress >= state.duration - 1 && // Within 1 second of end
      state.currentSong; // Has a current song

    // Update previous state for next comparison
    previousStateRef.current = {
      progress: state.progress,
      duration: state.duration,
      isPlaying: state.isPlaying,
    };

    // Auto-advance if song just ended and repeat mode isn't "one"
    if (songJustEnded && state.repeatMode !== "one") {
      console.log(
        `🎵 Song "${state.currentSong?.title}" ended, auto-advancing to next track`
      );
      // Use setTimeout to avoid any potential state update conflicts
      setTimeout(() => {
        nextTrack();
      }, 100);
    }
  }, [
    state.progress,
    state.duration,
    state.isPlaying,
    state.currentSong,
    state.repeatMode,
    nextTrack,
  ]);

  const contextValue: AudioPlayerContextType = {
    state,
    queueVersion,
    playSong,
    playPause,
    stop,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    nextTrack,
    previousTrack,
    refreshState,
    startSeeking,
    stopSeeking,
    getRecentlyPlayed,
    getLastPlayedSong,
    resumeLastSong,
    createQueueFromSource,
    addToQueue,
    removeFromQueue,
    getQueue,
    getQueueStats,
    clearQueue,
    clearSavedQueue,
    jumpToSong,
    reorderQueue,
  };

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
