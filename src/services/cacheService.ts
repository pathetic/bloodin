interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStorage {
  songs: Map<string, CacheItem<any>>;
  albums: Map<string, CacheItem<any>>;
  recentSongs: CacheItem<any> | null;
  recentAlbums: CacheItem<any> | null;
}

class CacheService {
  private cache: CacheStorage;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor() {
    this.cache = {
      songs: new Map(),
      albums: new Map(),
      recentSongs: null,
      recentAlbums: null,
    };

    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private createCacheKey(
    page: number,
    limit: number,
    searchTerm?: string
  ): string {
    return `${page}_${limit}_${searchTerm || "all"}`;
  }

  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() > item.expiresAt;
  }

  private createCacheItem<T>(data: T): CacheItem<T> {
    const now = Date.now();
    return {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION,
    };
  }

  // Songs cache methods
  getSongs(page: number, limit: number, searchTerm?: string): any | null {
    const key = this.createCacheKey(page, limit, searchTerm);
    const cached = this.cache.songs.get(key);

    if (cached && !this.isExpired(cached)) {
      console.log(`📦 CACHE HIT for songs: ${key}`);
      return cached.data;
    }

    if (cached) {
      console.log(`⏰ CACHE EXPIRED for songs: ${key}`);
      this.cache.songs.delete(key);
    }

    return null;
  }

  setSongs(page: number, limit: number, data: any, searchTerm?: string): void {
    const key = this.createCacheKey(page, limit, searchTerm);
    this.cache.songs.set(key, this.createCacheItem(data));
    console.log(`💾 CACHED songs: ${key} (${data.items?.length || 0} items)`);
  }

  // Albums cache methods
  getAlbums(page: number, limit: number, searchTerm?: string): any | null {
    const key = this.createCacheKey(page, limit, searchTerm);
    const cached = this.cache.albums.get(key);

    if (cached && !this.isExpired(cached)) {
      console.log(`📦 CACHE HIT for albums: ${key}`);
      return cached.data;
    }

    if (cached) {
      console.log(`⏰ CACHE EXPIRED for albums: ${key}`);
      this.cache.albums.delete(key);
    }

    return null;
  }

  setAlbums(page: number, limit: number, data: any, searchTerm?: string): void {
    const key = this.createCacheKey(page, limit, searchTerm);
    this.cache.albums.set(key, this.createCacheItem(data));
    console.log(`💾 CACHED albums: ${key} (${data.items?.length || 0} items)`);
  }

  // Recent songs cache methods
  getRecentSongs(): any | null {
    if (this.cache.recentSongs && !this.isExpired(this.cache.recentSongs)) {
      console.log(`📦 CACHE HIT for recent songs`);
      return this.cache.recentSongs.data;
    }

    if (this.cache.recentSongs) {
      console.log(`⏰ CACHE EXPIRED for recent songs`);
      this.cache.recentSongs = null;
    }

    return null;
  }

  setRecentSongs(data: any): void {
    this.cache.recentSongs = this.createCacheItem(data);
    console.log(`💾 CACHED recent songs (${data.length || 0} items)`);
  }

  // Recent albums cache methods
  getRecentAlbums(): any | null {
    if (this.cache.recentAlbums && !this.isExpired(this.cache.recentAlbums)) {
      console.log(`📦 CACHE HIT for recent albums`);
      return this.cache.recentAlbums.data;
    }

    if (this.cache.recentAlbums) {
      console.log(`⏰ CACHE EXPIRED for recent albums`);
      this.cache.recentAlbums = null;
    }

    return null;
  }

  setRecentAlbums(data: any): void {
    this.cache.recentAlbums = this.createCacheItem(data);
    console.log(`💾 CACHED recent albums (${data.length || 0} items)`);
  }

  // Utility methods
  clearCache(): void {
    this.cache.songs.clear();
    this.cache.albums.clear();
    this.cache.recentSongs = null;
    this.cache.recentAlbums = null;
    console.log(`🗑️ CACHE CLEARED`);
  }

  private cleanupExpiredEntries(): void {
    let cleaned = 0;

    // Clean expired songs
    for (const [key, item] of this.cache.songs.entries()) {
      if (this.isExpired(item)) {
        this.cache.songs.delete(key);
        cleaned++;
      }
    }

    // Clean expired albums
    for (const [key, item] of this.cache.albums.entries()) {
      if (this.isExpired(item)) {
        this.cache.albums.delete(key);
        cleaned++;
      }
    }

    // Clean expired recent items
    if (this.cache.recentSongs && this.isExpired(this.cache.recentSongs)) {
      this.cache.recentSongs = null;
      cleaned++;
    }

    if (this.cache.recentAlbums && this.isExpired(this.cache.recentAlbums)) {
      this.cache.recentAlbums = null;
      cleaned++;
    }

    if (cleaned > 0) {
      console.log(`🧹 CLEANED ${cleaned} expired cache entries`);
    }
  }

  // Debug method to show cache status
  getCacheStatus(): object {
    return {
      songs: this.cache.songs.size,
      albums: this.cache.albums.size,
      recentSongs: this.cache.recentSongs ? "cached" : "empty",
      recentAlbums: this.cache.recentAlbums ? "cached" : "empty",
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();
