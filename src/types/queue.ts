// Queue Types and Interfaces

import { Song } from "./index";

export type QueueSourceType =
  | "playlist"
  | "album"
  | "artist"
  | "manual"
  | "none";

export interface QueueSource {
  type: QueueSourceType;
  id?: string; // Source ID (playlist/album/artist ID)
  name?: string; // Source name for display
}

export interface QueueState {
  // Source information
  source: QueueSource;

  // Queue management
  originalOrder: Song[]; // Original unshuffled order
  currentOrder: Song[]; // Current playing order (shuffled or not)
  currentIndex: number; // Index in currentOrder

  // History and future
  playedSongs: Song[]; // Songs already played (for shuffle)
  upcomingQueue: Song[]; // Manually added upcoming songs

  // States
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";
}

export interface QueueItem {
  song: Song;
  status: "playing" | "manual" | "auto";
  removable: boolean;
}

// Helper function to create empty queue state
export function createEmptyQueue(): QueueState {
  return {
    source: { type: "none" },
    originalOrder: [],
    currentOrder: [],
    currentIndex: 0,
    playedSongs: [],
    upcomingQueue: [],
    isShuffled: false,
    repeatMode: "none",
  };
}

// Utility function to shuffle array (Fisher-Yates algorithm)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
