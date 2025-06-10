import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { JellyfinApiService } from "../services/jellyfinApi";
import type { ConnectionForm } from "../types/jellyfin";
import { IconPlayerPlay, IconWifi, IconLogin } from "@tabler/icons-react";

interface LoginPageProps {
  onLogin?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<ConnectionForm>({
    serverUrl: "",
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(formData);

      if (result.success) {
        onLogin?.();
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(`Connection failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!formData.serverUrl) {
      setError("Please enter a server URL first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setServerInfo(null);

    try {
      const result = await JellyfinApiService.getServerInfo(formData.serverUrl);

      if (result.success && result.server_info) {
        setServerInfo(
          `Connected to ${result.server_info.server_name} (${result.server_info.version})`
        );
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(`Failed to connect to server: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      {/* Main content */}
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
              <IconPlayerPlay size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-base-content mb-2">Bloodin</h1>
          <p className="text-base-content/60 text-lg">
            Connect to your Jellyfin server
          </p>
        </div>

        {/* Login form */}
        <div className="bg-base-200 rounded-2xl p-8 shadow-xl border border-base-300">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              {/* Server URL */}
              <div>
                <label
                  htmlFor="serverUrl"
                  className="block text-sm font-medium text-base-content mb-2"
                >
                  Server URL
                </label>
                <input
                  type="url"
                  id="serverUrl"
                  value={formData.serverUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      serverUrl: e.target.value,
                    }))
                  }
                  placeholder="https://jellyfin.example.com"
                  className="input input-bordered w-full bg-base-100 border-base-300 text-base-content placeholder-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-base-content mb-2"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Enter your username"
                  className="input input-bordered w-full bg-base-100 border-base-300 text-base-content placeholder-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-base-content mb-2"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Enter your password"
                  className="input input-bordered w-full bg-base-100 border-base-300 text-base-content placeholder-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="alert alert-error">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success message */}
            {serverInfo && (
              <div className="alert alert-success">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{serverInfo}</span>
              </div>
            )}

            {/* Test connection button */}
            <button
              type="button"
              onClick={testConnection}
              disabled={isLoading || !formData.serverUrl}
              className="btn btn-outline w-full border-base-content/20 text-base-content/70 hover:bg-base-content/10 hover:border-base-content/30 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="loading loading-spinner loading-sm"></div>
                  <span>Testing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <IconWifi size={16} />
                  <span>Test Connection</span>
                </div>
              )}
            </button>

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn w-full bg-gradient-to-r from-red-500 to-red-700 border-none text-white font-semibold hover:from-red-600 hover:to-red-800 transform transition-all duration-200 hover:scale-105 shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="loading loading-spinner loading-sm"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <IconLogin size={16} />
                  <span>Connect to Server</span>
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-base-content/60">
              Don't have a Jellyfin server?{" "}
              <a
                href="https://jellyfin.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 font-medium underline decoration-dotted"
              >
                Learn more
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
