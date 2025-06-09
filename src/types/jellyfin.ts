// Jellyfin API Types
export interface ServerInfo {
  server_name: string;
  version: string;
  product_name: string;
  operating_system: string;
  id: string;
}

export interface UserProfile {
  name: string;
  id: string;
  has_password: boolean;
  has_configured_password: boolean;
  enable_auto_login: boolean;
}

// Tauri Command Response Types
export interface ConnectResult {
  success: boolean;
  message: string;
  user_name?: string;
  server_name?: string;
}

export interface ServerInfoResult {
  success: boolean;
  message: string;
  server_info?: ServerInfo;
}

export interface UserProfileResult {
  success: boolean;
  message: string;
  user_profile?: UserProfile;
}

export interface AuthCheckResult {
  is_authenticated: boolean;
  user_name?: string;
  server_name?: string;
  server_url?: string;
}

// Connection Form Data
export interface ConnectionForm {
  serverUrl: string;
  username: string;
  password: string;
}

// Music Library Types
export interface MusicItem {
  Id: string;
  Name: string;
  Type: string;
  UserData?: UserData;
  RunTimeTicks?: number;
  ProductionYear?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  Album?: string;
  AlbumArtist?: string;
  Artists?: string[];
  AlbumId?: string;
  ArtistItems?: NameIdPair[];
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  ChildCount?: number;
}

export interface UserData {
  IsFavorite: boolean;
  PlayCount?: number;
  PlaybackPositionTicks?: number;
  LastPlayedDate?: string;
}

export interface NameIdPair {
  Name: string;
  Id: string;
}

export interface MusicLibraryResult {
  success: boolean;
  message: string;
  items?: MusicItem[];
  total_count?: number;
}

// Helper functions
export function formatDuration(ticks?: number): string {
  if (!ticks) return "0:00";

  const totalSeconds = Math.floor(ticks / 10000000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDetailedDuration(ticks?: number): string {
  if (!ticks) return "0 seconds";

  const totalSeconds = Math.floor(ticks / 10000000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
  }

  // Join with commas and "and" for the last item
  if (parts.length === 1) {
    return parts[0];
  } else if (parts.length === 2) {
    return parts.join(" and ");
  } else {
    return parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
  }
}

export function getArtistName(item: MusicItem): string {
  // Prioritize Artists array first (contains all collaborating artists for songs)
  if (item.Artists && item.Artists.length > 0) {
    // Join multiple artists with " & " for better readability
    return item.Artists.join(" & ");
  }
  if (item.ArtistItems && item.ArtistItems.length > 0) {
    return item.ArtistItems.map((artist) => artist.Name).join(" & ");
  }
  // Fall back to AlbumArtist if no individual song artists are specified
  if (item.AlbumArtist) return item.AlbumArtist;
  return "Unknown Artist";
}

export function getAllArtists(item: MusicItem): string[] {
  if (item.Artists && item.Artists.length > 0) {
    return item.Artists;
  }
  if (item.ArtistItems && item.ArtistItems.length > 0) {
    return item.ArtistItems.map((artist) => artist.Name);
  }
  if (item.AlbumArtist) {
    return [item.AlbumArtist];
  }
  return ["Unknown Artist"];
}

export function getItemDisplayName(item: MusicItem): string {
  return item.Name || "Unknown";
}
