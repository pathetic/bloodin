import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

import {
  IconCheck,
  IconChevronDown,
  IconPlayerPlay,
} from "@tabler/icons-react";

export default function SettingsPage() {
  const [currentTheme, setCurrentTheme] = useState("dark");
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  const themes = [
    { name: "light", label: "Light", type: "light" },
    { name: "dark", label: "Dark", type: "dark" },
    { name: "cupcake", label: "Cupcake", type: "light" },
    { name: "bumblebee", label: "Bumblebee", type: "light" },
    { name: "emerald", label: "Emerald", type: "light" },
    { name: "corporate", label: "Corporate", type: "light" },
    { name: "synthwave", label: "Synthwave", type: "dark" },
    { name: "retro", label: "Retro", type: "light" },
    { name: "cyberpunk", label: "Cyberpunk", type: "dark" },
    { name: "valentine", label: "Valentine", type: "light" },
    { name: "halloween", label: "Halloween", type: "dark" },
    { name: "garden", label: "Garden", type: "light" },
    { name: "forest", label: "Forest", type: "dark" },
    { name: "aqua", label: "Aqua", type: "light" },
    { name: "lofi", label: "Lo-Fi", type: "light" },
    { name: "pastel", label: "Pastel", type: "light" },
    { name: "fantasy", label: "Fantasy", type: "light" },
    { name: "wireframe", label: "Wireframe", type: "light" },
    { name: "black", label: "Black", type: "dark" },
    { name: "luxury", label: "Luxury", type: "dark" },
    { name: "dracula", label: "Dracula", type: "dark" },
    { name: "cmyk", label: "CMYK", type: "light" },
    { name: "autumn", label: "Autumn", type: "light" },
    { name: "business", label: "Business", type: "light" },
    { name: "acid", label: "Acid", type: "light" },
    { name: "lemonade", label: "Lemonade", type: "light" },
    { name: "night", label: "Night", type: "dark" },
    { name: "coffee", label: "Coffee", type: "dark" },
    { name: "winter", label: "Winter", type: "light" },
    { name: "dim", label: "Dim", type: "dark" },
    { name: "nord", label: "Nord", type: "light" },
    { name: "sunset", label: "Sunset", type: "light" },
  ];

  // Sync with current theme on mount
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme) {
      setCurrentTheme(currentTheme);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsThemeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName);
    document.documentElement.setAttribute("data-theme", themeName);
    localStorage.setItem("theme", themeName);
    setIsThemeDropdownOpen(false);
  };

  const handleOpenLink = (url: string) => {
    invoke("open_link", { url });
  };

  const currentThemeData = themes.find((t) => t.name === currentTheme);

  return (
    <div className="h-full flex flex-col">
      {/* Simple Header */}
      <div className="flex-shrink-0 p-6 bg-black/15 backdrop-blur-md border-b border-white/10">
        <h1 className="text-3xl font-bold text-base-content">Settings</h1>
        <p className="text-base-content/60 mt-1">
          Customize your music experience
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 2-Column Grid for Theme and Audio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Theme Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-base-content flex items-center gap-2">
                  Appearance
                </h2>
                <p className="text-base-content/60 text-sm">
                  Choose your preferred theme
                </p>
              </div>

              {/* Theme Selector */}
              <div className="relative" ref={themeDropdownRef}>
                <button
                  onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                  className="cursor-pointer w-full flex items-center justify-between p-3 bg-base-200 hover:bg-base-300 border border-base-300 rounded-lg transition-colors"
                >
                  <div
                    className="flex items-center space-x-3 bg-transparent"
                    data-theme={currentTheme}
                  >
                    <div className="col-span-5 row-span-3 row-start-1 flex gap-4 py-1 px-2">
                      <div className="flex flex-shrink-0 flex-wrap gap-1">
                        <div className="bg-primary w-2 rounded"></div>
                        <div className="bg-secondary w-2 rounded"></div>
                        <div className="bg-accent w-2 rounded"></div>
                        <div className="bg-neutral w-2 rounded"></div>
                      </div>

                      <div className="flex-grow text-sm font-bold">
                        {currentThemeData?.label || currentTheme}
                      </div>
                    </div>
                  </div>
                  <IconChevronDown
                    size={16}
                    className={`text-base-content/60 transition-transform ${
                      isThemeDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown */}
                {isThemeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                    <div className="p-2 space-y-3">
                      {themes.map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => handleThemeChange(theme.name)}
                          className={`cursor-pointer w-full flex items-center justify-between p-2 rounded transition-colors ${
                            currentTheme === theme.name
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-base-200 text-base-content"
                          }`}
                          data-theme={theme.name}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="col-span-5 row-span-3 row-start-1 flex gap-4 py-1 px-2">
                              <div className="flex flex-shrink-0 flex-wrap gap-1">
                                <div className="bg-primary w-2 rounded"></div>
                                <div className="bg-secondary w-2 rounded"></div>
                                <div className="bg-accent w-2 rounded"></div>
                                <div className="bg-neutral w-2 rounded"></div>
                              </div>

                              <div className="flex-grow text-sm font-bold">
                                {theme.label}
                              </div>
                            </div>
                          </div>
                          {currentTheme === theme.name && (
                            <IconCheck size={14} className="text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audio Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-base-content">
                  Audio
                </h2>
                <p className="text-base-content/60 text-sm">
                  Audio playback settings
                </p>
              </div>
              <div className="p-4 bg-base-200/50 rounded-lg border border-base-300/50">
                <p className="text-base-content/60 text-sm">
                  Audio settings coming soon...
                </p>
              </div>
            </div>
          </div>

          {/* About Section - Full Width */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-base-content">About</h2>
              <p className="text-base-content/60 text-sm">
                Application information
              </p>
            </div>
            <div className="p-4 bg-base-200/50 rounded-lg border border-base-300/50">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center">
                    <IconPlayerPlay size={32} className="text-white" />
                  </div>
                </div>
                <h3
                  onClick={() => {
                    handleOpenLink("https://github.com/pathetic/bloodin");
                  }}
                  className="font-semibold text-base-content hover:underline cursor-pointer"
                >
                  Bloodin Music Player
                </h3>
                <p className="text-base-content/60 text-sm">Version 1.0.0</p>
                <p className="text-base-content/50 text-xs">
                  Built with ❤️ by{" "}
                  <p
                    onClick={() => {
                      handleOpenLink("https://github.com/pathetic");
                    }}
                    className="inline-block hover:underline cursor-pointer text-base-content"
                  >
                    david
                  </p>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
