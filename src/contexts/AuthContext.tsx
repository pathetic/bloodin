import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { JellyfinApiService } from "../services/jellyfinApi";
import type {
  AuthCheckResult,
  ConnectResult,
  ConnectionForm,
} from "../types/jellyfin";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userName?: string;
  serverName?: string;
  serverUrl?: string;
  login: (connectionData: ConnectionForm) => Promise<ConnectResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string | undefined>();
  const [serverName, setServerName] = useState<string | undefined>();
  const [serverUrl, setServerUrl] = useState<string | undefined>();

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const result: AuthCheckResult =
        await JellyfinApiService.checkAuthentication();
      setIsAuthenticated(result.is_authenticated);
      setUserName(result.user_name);
      setServerName(result.server_name);
      setServerUrl(result.server_url);
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUserName(undefined);
      setServerName(undefined);
      setServerUrl(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    connectionData: ConnectionForm
  ): Promise<ConnectResult> => {
    setIsLoading(true);
    try {
      const result = await JellyfinApiService.connectToJellyfin(connectionData);

      if (result.success) {
        setIsAuthenticated(true);
        setUserName(result.user_name);
        setServerName(result.server_name);

        // Call checkAuth to get complete user info including server URL
        try {
          await checkAuth();
        } catch (authError) {
          console.error(
            "Failed to get complete user info after login:",
            authError
          );
          // Don't fail the login if checkAuth fails, we have basic info
        }
      }

      return result;
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        message: `Login failed: ${error}`,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Stop audio playback before logout
      try {
        // Import AudioPlayerAPI to stop playback directly
        const { AudioPlayerAPI } = await import("../services/audioPlayerApi");
        await AudioPlayerAPI.stopPlayback();
        console.log("🎵 Stopped audio playback on logout");
      } catch (audioError) {
        console.error("Failed to stop audio on logout:", audioError);
        // Don't prevent logout if audio stop fails
      }

      await JellyfinApiService.logout();
      setIsAuthenticated(false);
      setUserName(undefined);
      setServerName(undefined);
      setServerUrl(undefined);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    userName,
    serverName,
    serverUrl,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
