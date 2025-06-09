// Core Types
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  albumArt?: string;
  track?: number;
  year?: number;
  genre?: string;
  artistIds?: string[]; // Artist IDs for navigation
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year?: number;
  albumArt?: string;
  songCount: number;
  duration: number;
  songs?: Song[];
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  songCount: number;
  image?: string;
  albums?: Album[];
}

export interface Playlist {
  id: string;
  name: string;
  songCount: number;
  duration: number;
  image?: string;
  songs?: Song[];
  isPublic?: boolean;
}

// UI State Types
export interface PlaybackState {
  isPlaying: boolean;
  currentSong?: Song;
  progress: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";
  queue: Song[];
  currentIndex: number;
}

export interface JellyfinServer {
  url: string;
  name?: string;
  version?: string;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

// Navigation types
export type NavigationPage =
  | "home"
  | "songs"
  | "albums"
  | "artists"
  | "playlists"
  | "search"
  | "settings";

// Re-export queue types
export type {
  QueueSourceType,
  QueueSource,
  QueueState,
  QueueItem,
} from "./queue";
export { createEmptyQueue, shuffleArray } from "./queue";
