import { invoke } from "@tauri-apps/api/core";
import type {
  ConnectResult,
  ServerInfoResult,
  UserProfileResult,
  AuthCheckResult,
  ConnectionForm,
  MusicLibraryResult,
} from "../types/jellyfin";

export class JellyfinApiService {
  /**
   * Connect to a Jellyfin server and authenticate
   */
  static async connectToJellyfin(
    connectionData: ConnectionForm
  ): Promise<ConnectResult> {
    try {
      const result = await invoke<ConnectResult>("connect_to_jellyfin", {
        serverUrl: connectionData.serverUrl,
        username: connectionData.username,
        password: connectionData.password,
      });
      return result;
    } catch (error) {
      console.error("Failed to connect to Jellyfin:", error);
      return {
        success: false,
        message: `Connection failed: ${error}`,
      };
    }
  }

  /**
   * Get server information (public endpoint, no auth required)
   */
  static async getServerInfo(serverUrl: string): Promise<ServerInfoResult> {
    try {
      const result = await invoke<ServerInfoResult>("get_server_info", {
        serverUrl,
      });
      return result;
    } catch (error) {
      console.error("Failed to get server info:", error);
      return {
        success: false,
        message: `Failed to get server info: ${error}`,
      };
    }
  }

  /**
   * Get current user profile (requires authentication)
   */
  static async getUserProfile(): Promise<UserProfileResult> {
    try {
      const result = await invoke<UserProfileResult>("get_user_profile");
      return result;
    } catch (error) {
      console.error("Failed to get user profile:", error);
      return {
        success: false,
        message: `Failed to get user profile: ${error}`,
      };
    }
  }

  /**
   * Check if user is authenticated and load saved credentials
   */
  static async checkAuthentication(): Promise<AuthCheckResult> {
    try {
      const result = await invoke<AuthCheckResult>("check_authentication");
      return result;
    } catch (error) {
      console.error("Failed to check authentication:", error);
      return {
        is_authenticated: false,
      };
    }
  }

  /**
   * Logout and clear saved credentials
   */
  static async logout(): Promise<boolean> {
    try {
      const result = await invoke<boolean>("logout");
      return result;
    } catch (error) {
      console.error("Failed to logout:", error);
      return false;
    }
  }

  /**
   * Test server connection (just checks if server is reachable)
   */
  static async testServerConnection(serverUrl: string): Promise<boolean> {
    const result = await this.getServerInfo(serverUrl);
    return result.success;
  }

  /**
   * Get songs from the music library
   */
  static async getSongs(
    limit?: number,
    startIndex?: number
  ): Promise<MusicLibraryResult> {
    try {
      console.log(
        `🚀 Calling get_songs with limit: ${limit}, startIndex: ${startIndex} (type: ${typeof startIndex})`
      );

      const params = {
        limit: limit ?? null,
        startIndex: startIndex ?? null,
      };

      console.log(`🔧 Tauri invoke params:`, params);

      const result = await invoke<MusicLibraryResult>("get_songs", params);
      return result;
    } catch (error) {
      console.error("Failed to get songs:", error);
      return {
        success: false,
        message: `Failed to get songs: ${error}`,
      };
    }
  }

  /**
   * Get albums from the music library
   */
  static async getAlbums(
    limit?: number,
    startIndex?: number
  ): Promise<MusicLibraryResult> {
    try {
      const result = await invoke<MusicLibraryResult>("get_albums", {
        limit,
        startIndex: startIndex,
      });
      return result;
    } catch (error) {
      console.error("Failed to get albums:", error);
      return {
        success: false,
        message: `Failed to get albums: ${error}`,
      };
    }
  }

  /**
   * Get artists from the music library
   */
  static async getArtists(
    limit?: number,
    startIndex?: number
  ): Promise<MusicLibraryResult> {
    try {
      const result = await invoke<MusicLibraryResult>("get_artists", {
        limit,
        start_index: startIndex,
      });
      return result;
    } catch (error) {
      console.error("Failed to get artists:", error);
      return {
        success: false,
        message: `Failed to get artists: ${error}`,
      };
    }
  }

  /**
   * Get playlists from the music library
   */
  static async getPlaylists(
    limit?: number,
    startIndex?: number
  ): Promise<MusicLibraryResult> {
    try {
      const result = await invoke<MusicLibraryResult>("get_playlists", {
        limit,
        start_index: startIndex,
      });
      return result;
    } catch (error) {
      console.error("Failed to get playlists:", error);
      return {
        success: false,
        message: `Failed to get playlists: ${error}`,
      };
    }
  }

  /**
   * Search across all music items
   */
  static async searchMusic(
    query: string,
    limit?: number
  ): Promise<MusicLibraryResult> {
    try {
      const result = await invoke<MusicLibraryResult>("search_music", {
        query,
        limit,
      });
      return result;
    } catch (error) {
      console.error("Failed to search music:", error);
      return {
        success: false,
        message: `Search failed: ${error}`,
      };
    }
  }

  /**
   * Get image URL for an item
   */
  static async getImageUrl(
    itemId: string,
    imageType: string = "Primary"
  ): Promise<string | null> {
    try {
      const result = await invoke<string>("get_image_url", {
        itemId: itemId,
        imageType: imageType,
      });

      // Test if the image URL is accessible
      if (result) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve(result);
          };
          img.onerror = () => {
            resolve(null);
          };
          img.src = result;
        });
      }

      return result;
    } catch (error) {
      console.error("Failed to get image URL:", error);
      return null;
    }
  }

  /**
   * Get stream URL for audio playback
   */
  static async getStreamUrl(itemId: string): Promise<string | null> {
    try {
      const result = await invoke<string>("get_stream_url", {
        itemId: itemId,
      });
      return result;
    } catch (error) {
      console.error("Failed to get stream URL:", error);
      return null;
    }
  }

  /**
   * Get random songs for exploration
   */
  static async getRandomSongs(limit?: number): Promise<MusicLibraryResult> {
    try {
      console.log(`🎲 Calling get_random_songs with limit: ${limit}`);
      const result = await invoke<MusicLibraryResult>("get_random_songs", {
        limit,
      });
      return result;
    } catch (error) {
      console.error("Failed to get random songs:", error);
      return {
        success: false,
        message: `Failed to get random songs: ${error}`,
      };
    }
  }

  /**
   * Get recently added albums
   */
  static async getRecentAlbums(
    limit?: number,
    startIndex?: number
  ): Promise<MusicLibraryResult> {
    try {
      console.log(
        `📅 Calling get_recent_albums with limit: ${limit}, startIndex: ${startIndex}`
      );
      const result = await invoke<MusicLibraryResult>("get_recent_albums", {
        limit,
        start_index: startIndex,
      });
      return result;
    } catch (error) {
      console.error("Failed to get recent albums:", error);
      return {
        success: false,
        message: `Failed to get recent albums: ${error}`,
      };
    }
  }

  /**
   * Get songs from a specific album
   */
  static async getAlbumSongs(albumId: string): Promise<MusicLibraryResult> {
    try {
      const result = await invoke<MusicLibraryResult>("get_album_songs", {
        albumId,
      });
      return result;
    } catch (error) {
      console.error("Failed to get album songs:", error);
      return {
        success: false,
        message: `Failed to get album songs: ${error}`,
      };
    }
  }

  /**
   * Get songs from a specific artist
   */
  static async getArtistSongs(artistId: string): Promise<MusicLibraryResult> {
    try {
      const result = await invoke<MusicLibraryResult>("get_artist_songs", {
        artistId,
      });
      return result;
    } catch (error) {
      console.error("Failed to get artist songs:", error);
      return {
        success: false,
        message: `Failed to get artist songs: ${error}`,
      };
    }
  }

  /**
   * Get details for a specific item (album, artist, etc.)
   */
  static async getItem(
    itemId: string
  ): Promise<{ success: boolean; item?: any; message?: string }> {
    try {
      const result = await invoke<{
        success: boolean;
        item?: any;
        message?: string;
      }>("get_item", {
        itemId,
      });
      return result;
    } catch (error) {
      console.error("Failed to get item:", error);
      return {
        success: false,
        message: `Failed to get item: ${error}`,
      };
    }
  }
}
