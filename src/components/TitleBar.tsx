import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  IconMinimize,
  IconWindowMinimize,
  IconWindowMaximize,
  IconX,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";

import whiteLogo from "../assets/white.png";
import blackLogo from "../assets/black.png";
import whiteText from "../assets/whitetext.png";
import blackText from "../assets/blacktext.png";
import SearchBar from "./SearchBar";

interface TitleBarProps {
  className?: string;
}

const lightThemes = [
  "light",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "retro",
  "valentine",
  "garden",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "winter",
  "nord",
  "sunset",
];

export default function TitleBar({ className }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  const appWindow = getCurrentWindow();

  useEffect(() => {
    // Function to check and set the theme
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      setIsLightTheme(lightThemes.includes(theme || ""));
    };

    // Initial check
    checkTheme();

    // Observe changes to the data-theme attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          checkTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
    });

    // Cleanup observer on component unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  const minimizeWindow = async () => {
    await appWindow.minimize();
  };

  const maximizeWindow = async () => {
    await appWindow.toggleMaximize();
  };

  const closeWindow = async () => {
    await appWindow.close();
  };

  async function checkWindowMaximized() {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      console.log("Window is maximized");
    } else {
      console.log("Window is not maximized");
    }
  }

  useEffect(() => {
    appWindow.onResized(() => {
      checkWindowMaximized();
    });
  }, []);

  return (
    <div
      data-tauri-drag-region
      className={`flex justify-between w-[100%] text-base-content bg-black/15 backdrop-blur-md select-none border-b border-white/10 ${
        className || ""
      }`}
    >
      <div data-tauri-drag-region className="px-2 py-2 flex items-center">
        <div className="flex items-center space-x-3">
          <img
            src={isLightTheme ? blackLogo : whiteLogo}
            alt="Bloodin"
            className="w-10 h-10"
          />
          <img
            src={isLightTheme ? blackText : whiteText}
            alt="Bloodin"
            className="w-full max-h-4"
          />
        </div>
      </div>

      {/* Search Bar in the middle */}
      <div
        data-tauri-drag-region
        className="flex-1 flex items-center justify-center px-2"
      >
        <div className="pointer-events-auto">
          <SearchBar />
        </div>
      </div>

      <ul className="flex items-center pr-2 gap-2">
        <li
          className="p-2 cursor-pointer rounded-md hover:bg-base-200"
          onClick={minimizeWindow}
        >
          <IconMinimize size={20} className="text-base-content" />
        </li>
        <li
          className="p-2 cursor-pointer rounded-md hover:bg-base-200"
          onClick={maximizeWindow}
        >
          {isMaximized ? (
            <IconWindowMinimize size={20} className="text-base-content" />
          ) : (
            <IconWindowMaximize size={20} className="text-base-content" />
          )}
        </li>
        <li
          className="p-2 cursor-pointer rounded-md hover:bg-red-500 hover:text-white"
          onClick={closeWindow}
        >
          <IconX size={20} className="text-base-content" />
        </li>
      </ul>
    </div>
  );
}
