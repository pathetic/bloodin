import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { JellyfinApiService } from "../services/jellyfinApi";
import type { ConnectionForm } from "../types/jellyfin";

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
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-200"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-red-700 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-400"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
            Bloodin
          </h1>
          <p className="text-red-200 text-lg">
            Connect to your Jellyfin server
          </p>
        </div>

        {/* Login form */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              {/* Server URL */}
              <div>
                <label
                  htmlFor="serverUrl"
                  className="block text-sm font-medium text-red-100 mb-2"
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
                  className="input input-bordered w-full bg-white/10 border-white/20 text-white placeholder-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 backdrop-blur-sm"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-red-100 mb-2"
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
                  className="input input-bordered w-full bg-white/10 border-white/20 text-white placeholder-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 backdrop-blur-sm"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-red-100 mb-2"
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
                  className="input input-bordered w-full bg-white/10 border-white/20 text-white placeholder-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 backdrop-blur-sm"
                  required
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="alert alert-error bg-red-500/20 border-red-500/30 text-red-200">
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
              <div className="alert alert-success bg-green-500/20 border-green-500/30 text-green-200">
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
              className="btn btn-outline w-full border-red-400/50 text-red-200 hover:bg-red-500/20 hover:border-red-400 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="loading loading-spinner loading-sm"></div>
                  <span>Testing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                    />
                  </svg>
                  <span>Test Connection</span>
                </div>
              )}
            </button>

            {/* Login button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full bg-gradient-to-r from-red-500 to-red-700 border-none text-white font-semibold py-3 rounded-xl hover:from-red-600 hover:to-red-800 focus:ring-4 focus:ring-red-500/30 transform transition-all duration-200 hover:scale-105 shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="loading loading-spinner loading-sm"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
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
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Connect to Server</span>
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-red-200">
              Don't have a Jellyfin server?{" "}
              <a
                href="https://jellyfin.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-300 hover:text-red-200 font-medium underline decoration-dotted"
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
