import { invoke } from "@tauri-apps/api/core";

// Backend types that match our Rust definitions
export interface PlaybackState {
  is_playing: boolean;
  current_position: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0.0 to 1.0
  is_shuffled: boolean;
  repeat_mode: "None" | "One" | "All";
  current_song?: QueueItem;
}

export interface QueueItem {
  id: string;
  name: string;
  artists: string[];
  artist_ids?: string[]; // Artist IDs for navigation
  album?: string;
  duration_ticks?: number;
  stream_url: string;
}

export type RepeatMode = "None" | "One" | "All";

// Frontend-friendly conversion functions
export const convertBackendPlaybackState = (backendState: PlaybackState) => ({
  isPlaying: backendState.is_playing,
  currentPosition: backendState.current_position,
  duration: backendState.duration,
  volume: backendState.volume,
  isShuffled: backendState.is_shuffled,
  repeatMode: backendState.repeat_mode.toLowerCase() as "none" | "one" | "all",
  currentSong: backendState.current_song
    ? convertBackendQueueItem(backendState.current_song)
    : undefined,
});

export const convertBackendQueueItem = (backendItem: QueueItem) => ({
  id: backendItem.id,
  title: backendItem.name,
  artist: backendItem.artists.join(" & "),
  album: backendItem.album || "",
  duration: backendItem.duration_ticks
    ? Math.floor(backendItem.duration_ticks / 10_000_000)
    : 0,
  albumArt: undefined, // We'll need to fetch this separately
  artistIds: backendItem.artist_ids, // Pass through artist IDs for navigation
});

export const convertRepeatModeToBackend = (
  mode: "none" | "one" | "all"
): string => {
  switch (mode) {
    case "none":
      return "none";
    case "one":
      return "one";
    case "all":
      return "all";
  }
};

// Audio Player API functions
export class AudioPlayerAPI {
  static async playSong(itemId: string): Promise<boolean> {
    try {
      return await invoke<boolean>("play_song", { itemId });
    } catch (error) {
      console.error("Failed to play song:", error);
      throw error;
    }
  }

  static async pausePlayback(): Promise<boolean> {
    try {
      return await invoke<boolean>("pause_playback");
    } catch (error) {
      console.error("Failed to pause playback:", error);
      throw error;
    }
  }

  static async resumePlayback(): Promise<boolean> {
    try {
      return await invoke<boolean>("resume_playback");
    } catch (error) {
      console.error("Failed to resume playback:", error);
      throw error;
    }
  }

  static async stopPlayback(): Promise<boolean> {
    try {
      return await invoke<boolean>("stop_playback");
    } catch (error) {
      console.error("Failed to stop playback:", error);
      throw error;
    }
  }

  static async setVolume(volume: number): Promise<boolean> {
    try {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume));
      return await invoke<boolean>("set_volume", { volume: clampedVolume });
    } catch (error) {
      console.error("Failed to set volume:", error);
      throw error;
    }
  }

  static async seekTo(position: number): Promise<boolean> {
    try {
      return await invoke<boolean>("seek_to", { position });
    } catch (error) {
      console.error("Failed to seek:", error);
      throw error;
    }
  }

  static async toggleShuffle(): Promise<boolean> {
    try {
      return await invoke<boolean>("toggle_shuffle");
    } catch (error) {
      console.error("Failed to toggle shuffle:", error);
      throw error;
    }
  }

  static async setRepeatMode(mode: "none" | "one" | "all"): Promise<boolean> {
    try {
      const backendMode = convertRepeatModeToBackend(mode);
      return await invoke<boolean>("set_repeat_mode", { mode: backendMode });
    } catch (error) {
      console.error("Failed to set repeat mode:", error);
      throw error;
    }
  }

  static async getPlaybackState(): Promise<PlaybackState> {
    try {
      return await invoke<PlaybackState>("get_playback_state");
    } catch (error) {
      console.error("Failed to get playback state:", error);
      throw error;
    }
  }

  static async nextTrack(): Promise<boolean> {
    try {
      return await invoke<boolean>("next_track");
    } catch (error) {
      console.error("Failed to go to next track:", error);
      throw error;
    }
  }

  static async previousTrack(): Promise<boolean> {
    try {
      return await invoke<boolean>("previous_track");
    } catch (error) {
      console.error("Failed to go to previous track:", error);
      throw error;
    }
  }
}
