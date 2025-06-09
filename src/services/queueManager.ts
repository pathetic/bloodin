// Queue Manager Service

import { Song } from "../types";
import {
  QueueState,
  QueueSource,
  QueueItem,
  createEmptyQueue,
  shuffleArray,
} from "../types/queue";

export class QueueManager {
  private state: QueueState;
  private lastPreviousClickTime: number = 0;
  private static hasLoggedRestore: boolean = false;

  constructor() {
    this.state = this.loadQueueFromStorage() || createEmptyQueue();
  }

  // Save queue state to localStorage
  private saveQueueToStorage(): void {
    try {
      const stateToSave = {
        ...this.state,
        // Don't save songs that might become stale, only save IDs and basic info
        currentOrder: this.state.currentOrder.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          albumArt: song.albumArt,
          artistIds: song.artistIds,
        })),
        originalOrder: this.state.originalOrder.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          albumArt: song.albumArt,
          artistIds: song.artistIds,
        })),
        playedSongs: this.state.playedSongs.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          albumArt: song.albumArt,
          artistIds: song.artistIds,
        })),
        upcomingQueue: this.state.upcomingQueue.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          albumArt: song.albumArt,
          artistIds: song.artistIds,
        })),
      };
      localStorage.setItem("bloodin_queue_state", JSON.stringify(stateToSave));
      localStorage.setItem("bloodin_queue_version", "1.0");
    } catch (error) {
      console.error("Failed to save queue state:", error);
    }
  }

  // Load queue state from localStorage
  private loadQueueFromStorage(): QueueState | null {
    try {
      const saved = localStorage.getItem("bloodin_queue_state");
      const version = localStorage.getItem("bloodin_queue_version");

      if (saved && version === "1.0") {
        const parsedState = JSON.parse(saved);

        // Validate the structure
        if (
          parsedState &&
          parsedState.source &&
          Array.isArray(parsedState.currentOrder)
        ) {
          // Only log on first restoration to avoid spam
          if (!QueueManager.hasLoggedRestore) {
            console.log("🔄 Restored queue state from localStorage");
            QueueManager.hasLoggedRestore = true;
          }
          return parsedState as QueueState;
        }
      }

      // Clear invalid data
      localStorage.removeItem("bloodin_queue_state");
      localStorage.removeItem("bloodin_queue_version");
      return null;
    } catch (error) {
      console.error("Failed to load queue state:", error);
      return null;
    }
  }

  // Clear saved queue state
  clearSavedQueue(): void {
    try {
      localStorage.removeItem("bloodin_queue_state");
      localStorage.removeItem("bloodin_queue_version");
      console.log("🗑️ Cleared saved queue state");
    } catch (error) {
      console.error("Failed to clear saved queue state:", error);
    }
  }

  // Get current queue state
  getState(): QueueState {
    return { ...this.state };
  }

  // Create queue from source
  createQueue(
    songs: Song[],
    source: QueueSource,
    shuffle: boolean = false,
    startIndex: number = 0
  ): void {
    const shuffledOrder = shuffle ? shuffleArray(songs) : [...songs];

    this.state = {
      source,
      originalOrder: [...songs],
      currentOrder: shuffledOrder,
      currentIndex: startIndex,
      playedSongs: [],
      upcomingQueue: [],
      isShuffled: shuffle,
      repeatMode: this.state.repeatMode, // Preserve repeat mode
    };

    // If we're starting at a non-zero index in shuffle mode,
    // populate playedSongs with the songs that came "before" this position
    if (shuffle && startIndex > 0) {
      this.state.playedSongs = shuffledOrder.slice(0, startIndex);
    }

    // Save to localStorage
    this.saveQueueToStorage();
  }

  // Get current song
  getCurrentSong(): Song | null {
    if (this.state.currentOrder.length === 0) return null;
    return this.state.currentOrder[this.state.currentIndex] || null;
  }

  // Get next song with logic
  getNextSong(): Song | null {
    // 1. Check if manually queued songs exist
    if (this.state.upcomingQueue.length > 0) {
      return this.state.upcomingQueue[0]; // Don't remove yet, will be removed on actual play
    }

    // 2. Check repeat mode
    if (this.state.repeatMode === "one") {
      return this.getCurrentSong();
    }

    // 3. Move to next in current order
    if (this.state.currentIndex < this.state.currentOrder.length - 1) {
      return this.state.currentOrder[this.state.currentIndex + 1];
    }

    // 4. Handle end of queue
    if (this.state.repeatMode === "all") {
      if (this.state.isShuffled) {
        // Re-shuffle for next loop
        this.state.currentOrder = shuffleArray(this.state.originalOrder);
      }
      return this.state.currentOrder[0] || null;
    }

    // 5. Queue ended
    return null;
  }

  // Advance to next track
  advanceToNext(): Song | null {
    // Handle manual queue first
    if (this.state.upcomingQueue.length > 0) {
      const nextSong = this.state.upcomingQueue.shift()!;
      // Add current song to played songs if shuffled
      if (this.state.isShuffled && this.getCurrentSong()) {
        this.state.playedSongs.push(this.getCurrentSong()!);
      }
      this.saveQueueToStorage();
      return nextSong;
    }

    // Handle repeat one
    if (this.state.repeatMode === "one") {
      return this.getCurrentSong();
    }

    // Normal advancement
    if (this.state.currentIndex < this.state.currentOrder.length - 1) {
      // Add current song to played songs if shuffled
      if (this.state.isShuffled && this.getCurrentSong()) {
        this.state.playedSongs.push(this.getCurrentSong()!);
      }
      this.state.currentIndex++;
      this.saveQueueToStorage();
      return this.getCurrentSong();
    }

    // End of queue
    if (this.state.repeatMode === "all") {
      // Add current song to played songs if shuffled
      if (this.state.isShuffled && this.getCurrentSong()) {
        this.state.playedSongs.push(this.getCurrentSong()!);
      }

      this.state.currentIndex = 0;
      if (this.state.isShuffled) {
        // Re-shuffle for next loop and clear played songs
        this.state.currentOrder = shuffleArray(this.state.originalOrder);
        this.state.playedSongs = [];
      }
      this.saveQueueToStorage();
      return this.getCurrentSong();
    }

    return null;
  }

  // Previous track with 10-second rule
  getPreviousSong(currentPlaybackTime: number): {
    action: "restart" | "previous";
    song: Song | null;
  } {
    const now = Date.now();
    const timeSinceLastClick = now - this.lastPreviousClickTime;
    this.lastPreviousClickTime = now;

    // If song has played > 10 seconds, restart current song
    if (currentPlaybackTime > 10) {
      return { action: "restart", song: this.getCurrentSong() };
    }

    // If song < 10 seconds OR this is a double-click (< 1 second between clicks)
    if (currentPlaybackTime <= 10 || timeSinceLastClick < 1000) {
      return { action: "previous", song: this.moveToPrevious() };
    }

    // Default to restart
    return { action: "restart", song: this.getCurrentSong() };
  }

  // Move to previous track
  private moveToPrevious(): Song | null {
    // If we have played songs in shuffle mode
    if (this.state.isShuffled && this.state.playedSongs.length > 0) {
      const previousSong = this.state.playedSongs.pop()!;

      // Insert current song back into current order at beginning
      if (this.getCurrentSong()) {
        this.state.currentOrder.unshift(this.getCurrentSong()!);
        this.state.currentIndex = 1; // Update index since we inserted at beginning
      }
      this.state.currentIndex = 0;
      this.state.currentOrder[0] = previousSong;
      this.saveQueueToStorage();
      return previousSong;
    }

    // Normal previous in order
    if (this.state.currentIndex > 0) {
      this.state.currentIndex--;
      this.saveQueueToStorage();
      return this.getCurrentSong();
    }

    // Beginning of queue
    if (this.state.repeatMode === "all") {
      this.state.currentIndex = this.state.currentOrder.length - 1;
      this.saveQueueToStorage();
      return this.getCurrentSong();
    }

    return null;
  }

  // Toggle shuffle mode
  toggleShuffle(): boolean {
    if (this.state.isShuffled) {
      // Disable shuffle - find current song in original order
      const currentSong = this.getCurrentSong();
      if (currentSong) {
        const originalIndex = this.state.originalOrder.findIndex(
          (s) => s.id === currentSong.id
        );
        this.state.currentOrder = [...this.state.originalOrder];
        this.state.currentIndex = originalIndex >= 0 ? originalIndex : 0;
      }
      this.state.playedSongs = [];
      this.state.isShuffled = false;
    } else {
      // Enable shuffle - keep current song at current position
      const currentSong = this.getCurrentSong();
      const remainingSongs = this.state.originalOrder.filter(
        (s) => s.id !== currentSong?.id
      );
      const shuffledRemaining = shuffleArray(remainingSongs);

      if (currentSong) {
        this.state.currentOrder = [currentSong, ...shuffledRemaining];
        this.state.currentIndex = 0;
      } else {
        this.state.currentOrder = shuffleArray(this.state.originalOrder);
        this.state.currentIndex = 0;
      }
      this.state.isShuffled = true;
    }

    this.saveQueueToStorage();
    return this.state.isShuffled;
  }

  // Set repeat mode
  setRepeatMode(mode: "none" | "one" | "all"): void {
    this.state.repeatMode = mode;
    this.saveQueueToStorage();
  }

  // Get visible queue for UI
  getVisibleQueue(): QueueItem[] {
    const result: QueueItem[] = [];

    // Currently playing
    const currentSong = this.getCurrentSong();
    if (currentSong) {
      result.push({
        song: currentSong,
        status: "playing",
        removable: false, // Can't remove currently playing song
      });
    }

    // Manual upcoming queue
    this.state.upcomingQueue.forEach((song) => {
      result.push({
        song,
        status: "manual",
        removable: true,
      });
    });

    // Auto queue (from source) - exclude the currently playing song
    // Now make them removable too!
    const remainingAutoSongs = this.state.currentOrder.slice(
      this.state.currentIndex + 1
    );
    remainingAutoSongs.forEach((song) => {
      result.push({
        song,
        status: "auto",
        removable: true, // Now removable!
      });
    });

    return result;
  }

  // Add song to queue
  addToQueue(song: Song, position: "next" | "end" = "end"): void {
    if (position === "next") {
      this.state.upcomingQueue.unshift(song);
    } else {
      this.state.upcomingQueue.push(song);
    }
    this.saveQueueToStorage();
  }

  // Remove song from queue (manual or auto)
  removeFromQueue(songId: string): boolean {
    // First try to remove from manual queue
    const manualIndex = this.state.upcomingQueue.findIndex(
      (s) => s.id === songId
    );
    if (manualIndex >= 0) {
      this.state.upcomingQueue.splice(manualIndex, 1);
      console.log(`🗑️ Removed song ${songId} from manual queue`);
      this.saveQueueToStorage();
      return true;
    }

    // Then try to remove from auto queue (currentOrder)
    // Don't allow removing the currently playing song
    const autoIndex = this.state.currentOrder.findIndex((s) => s.id === songId);
    if (autoIndex >= 0 && autoIndex !== this.state.currentIndex) {
      this.state.currentOrder.splice(autoIndex, 1);

      // Adjust current index if we removed a song before it
      if (autoIndex < this.state.currentIndex) {
        this.state.currentIndex--;
      }

      // Also remove from played songs if it exists there
      const playedIndex = this.state.playedSongs.findIndex(
        (s) => s.id === songId
      );
      if (playedIndex >= 0) {
        this.state.playedSongs.splice(playedIndex, 1);
      }

      console.log(`🗑️ Removed song ${songId} from auto queue`);
      this.saveQueueToStorage();
      return true;
    }

    // Song not found or is currently playing
    if (autoIndex === this.state.currentIndex) {
      console.warn(`Cannot remove currently playing song ${songId}`);
    } else {
      console.warn(`Song ${songId} not found in queue`);
    }
    return false;
  }

  // Clear queue
  clearQueue(): void {
    this.state = createEmptyQueue();
    this.saveQueueToStorage();
  }

  // Get queue stats
  getQueueStats() {
    return {
      total: this.state.currentOrder.length,
      current: this.state.currentIndex + 1,
      manual: this.state.upcomingQueue.length,
      source: this.state.source,
    };
  }

  // Jump to a specific song in the queue
  jumpToSong(songId: string): Song | null {
    // First check if it's in upcoming manual queue
    const manualIndex = this.state.upcomingQueue.findIndex(
      (s) => s.id === songId
    );
    if (manualIndex >= 0) {
      // Remove all items before this one in manual queue
      const targetSong = this.state.upcomingQueue[manualIndex];
      this.state.upcomingQueue.splice(0, manualIndex + 1);
      this.saveQueueToStorage();
      return targetSong;
    }

    // Check if it's in the current order
    const orderIndex = this.state.currentOrder.findIndex(
      (s) => s.id === songId
    );
    if (orderIndex >= 0) {
      // Add currently playing song to played songs if shuffled and moving forward
      if (
        this.state.isShuffled &&
        orderIndex > this.state.currentIndex &&
        this.getCurrentSong()
      ) {
        this.state.playedSongs.push(this.getCurrentSong()!);
      }

      // Update current index
      this.state.currentIndex = orderIndex;
      this.saveQueueToStorage();
      return this.getCurrentSong();
    }

    return null;
  }

  // Reorder songs in the queue (for drag and drop)
  reorderQueue(fromSongId: string, toIndex: number): boolean {
    // First, try to reorder in manual queue
    const fromManualIndex = this.state.upcomingQueue.findIndex(
      (s) => s.id === fromSongId
    );

    if (fromManualIndex >= 0) {
      // Reordering within manual queue
      const [movedSong] = this.state.upcomingQueue.splice(fromManualIndex, 1);

      // Calculate target index within manual queue
      const targetIndex = Math.max(
        0,
        Math.min(toIndex, this.state.upcomingQueue.length)
      );
      this.state.upcomingQueue.splice(targetIndex, 0, movedSong);

      console.log(
        `🔄 Reordered "${movedSong.title}" in manual queue to position ${targetIndex}`
      );
      this.saveQueueToStorage();
      return true;
    }

    // If not in manual queue, check main queue (but only allow reordering non-current songs)
    const fromMainIndex = this.state.currentOrder.findIndex(
      (s) => s.id === fromSongId
    );

    if (fromMainIndex >= 0 && fromMainIndex !== this.state.currentIndex) {
      // Don't allow reordering the currently playing song
      const [movedSong] = this.state.currentOrder.splice(fromMainIndex, 1);

      // Adjust current index if needed
      if (fromMainIndex < this.state.currentIndex) {
        this.state.currentIndex--;
      }

      // Calculate target index in main queue
      let targetIndex = Math.max(
        0,
        Math.min(toIndex, this.state.currentOrder.length)
      );

      // Don't allow moving before currently playing song
      if (targetIndex <= this.state.currentIndex) {
        targetIndex = this.state.currentIndex + 1;
      }

      this.state.currentOrder.splice(targetIndex, 0, movedSong);

      // Adjust current index if needed
      if (targetIndex <= this.state.currentIndex) {
        this.state.currentIndex++;
      }

      console.log(
        `🔄 Reordered "${movedSong.title}" in main queue to position ${targetIndex}`
      );
      this.saveQueueToStorage();
      return true;
    }

    console.warn(
      `Cannot reorder song ${fromSongId}: not found or is currently playing`
    );
    return false;
  }
}
