import React, { useState, useRef, useEffect } from "react";
import {
  IconSearch,
  IconMusic,
  IconMicrophone,
  IconDisc,
} from "@tabler/icons-react";

// Global variable to track search state for other components to check
declare global {
  interface Window {
    isSearchActive?: boolean;
  }
}

const SearchBar = () => {
  const [isActive, setIsActive] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeSearch = () => {
    setIsActive(false);
    setShowDropdown(false);
    inputRef.current?.blur();
    // Update global state
    window.isSearchActive = false;
  };

  const activateSearch = () => {
    setIsActive(true);
    // Update global state
    window.isSearchActive = true;
  };

  // Update global state when isActive changes
  useEffect(() => {
    window.isSearchActive = isActive;
  }, [isActive]);

  useEffect(() => {
    const handleClickAnywhere = (event: Event) => {
      const target = event.target as HTMLElement;

      // If click/mousedown is not on search container and search is active, close it
      if (
        isActive &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        closeSearch();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key to close search
      if (event.key === "Escape" && isActive) {
        closeSearch();
        return;
      }
    };

    // Use document listeners
    document.addEventListener("mousedown", handleClickAnywhere, true);
    document.addEventListener("click", handleClickAnywhere, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickAnywhere, true);
      document.removeEventListener("click", handleClickAnywhere, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive]);

  const handleFocus = () => {
    activateSearch();
    if (searchValue.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setShowDropdown(value.length > 0);
  };

  const handleSearchOptionClick = (type: string) => {
    console.log(`Search "${searchValue}" in ${type}`);
    // Future functionality will go here
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      data-search-container
    >
      {/* Search Container */}
      <div
        className={`
          relative flex items-center backdrop-blur-sm border rounded-full
          transition-all duration-500 ease-out cursor-pointer transform
          ${
            isActive
              ? "w-90 h-10 bg-base-100/30 border-primary/40 shadow-lg shadow-primary/10 scale-105"
              : "w-56 h-8 bg-base-100/10 border-white/20 hover:bg-base-100/20 hover:border-white/30"
          }
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Search Icon */}
        <div className="flex items-center justify-center shrink-0 pl-2.5 pr-1.5">
          <IconSearch
            size={isActive ? 16 : 14}
            className={`
              transition-all duration-300
              ${
                isActive
                  ? "text-primary"
                  : "text-base-content/60 hover:text-base-content/80"
              }
            `}
          />
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="What do you want to play?"
          className="bg-transparent outline-none focus:outline-none text-base-content placeholder-base-content/50 text-sm w-full pr-2.5"
          style={{ outline: "none", border: "none" }}
        />

        {/* Pulsing animations - when active */}
        {isActive && (
          <>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 animate-pulse pointer-events-none"></div>
            <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping pointer-events-none"></div>
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse pointer-events-none"></div>
          </>
        )}
      </div>

      {/* Dropdown Menu */}
      {showDropdown && searchValue && (
        <div
          className={`
            absolute top-13 left-1/2 transform -translate-x-1/2 w-90
            backdrop-blur-md bg-base-200/60 border border-white/10 rounded-2xl shadow-2xl z-50
            transition-all duration-300 ease-out
            ${
              showDropdown
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4"
            }
          `}
          style={{
            backdropFilter: "blur(25px) saturate(150%)",
            WebkitBackdropFilter: "blur(25px) saturate(150%)",
          }}
        >
          {/* Dropdown Header */}
          <div className="p-3 rounded-t-2xl bg-base-300/80 border-white/10 border-b">
            <p className="text-sm text-base-content font-semibold">
              Search for "{searchValue}"
            </p>
          </div>

          {/* Search Options */}
          <div className="py-3 space-y-2 backdrop-blur-xl bg-base-100/30">
            {[
              {
                type: "Songs",
                icon: IconMusic,
                color: "text-green-400",
                hoverBg: "hover:bg-green-400/10",
              },
              {
                type: "Artists",
                icon: IconMicrophone,
                color: "text-blue-400",
                hoverBg: "hover:bg-blue-400/10",
              },
              {
                type: "Albums",
                icon: IconDisc,
                color: "text-purple-400",
                hoverBg: "hover:bg-purple-400/10",
              },
            ].map(({ type, icon: Icon, color, hoverBg }) => (
              <button
                key={type}
                onClick={() => handleSearchOptionClick(type)}
                className={`
                  cursor-pointer
                  w-full flex items-center gap-3 px-3 py-2.5 text-left
                  transition-all duration-300 ease-out
                  hover:scale-[1.01] hover:shadow-md
                  group relative overflow-hidden
                  bg-base-200/20 ${hoverBg} hover:bg-base-200/40
                  border border-base-300/20 hover:border-base-300/40 rounded-lg mx-2
                  backdrop-blur-sm !w-[95%]
                `}
              >
                <div className="relative z-10">
                  <Icon
                    size={16}
                    className={`${color} transition-all duration-300 group-hover:scale-110`}
                  />
                </div>
                <span className="text-sm text-base-content group-hover:text-base-content transition-all duration-300 font-medium relative z-10 flex-1 truncate">
                  Search "{searchValue}" in {type}
                </span>
                <div
                  className={`
                  w-1.5 h-1.5 rounded-full ${color.replace("text-", "bg-")}
                  transition-all duration-300 group-hover:w-2 group-hover:h-2
                  relative z-10 flex-shrink-0
                `}
                ></div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-base-content/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
              </button>
            ))}
          </div>

          {/* Dropdown Footer */}
          <div className="px-3 py-2.5 border-t border-white/10 rounded-b-2xl bg-base-300/90">
            <p className="text-xs text-base-content/70 text-center font-medium">
              Press{" "}
              <kbd className="kbd kbd-xs bg-base-300/50 text-base-content/80 border-base-300/50">
                Enter
              </kbd>{" "}
              to search in all categories
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
