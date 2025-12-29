"use client";

import { useState, useEffect, useRef } from "react";
import { Coins, Users, Target, UserCircle, SignOut } from "phosphor-react";

const TypewriterText = ({
  text,
  isVisible,
}: {
  text: string;
  isVisible: boolean;
}) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setDisplayText("");
      setCurrentIndex(0);
      return;
    }

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 10); // Speed of typewriter effect

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, isVisible]);

  if (!isVisible) return null;

  return (
    <span className="text-xs ml-2 font-medium font-mono">{displayText}</span>
  );
};

interface BottomNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

const BottomNavigation = ({
  activeSection,
  onSectionChange,
  onLogout,
}: BottomNavigationProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        menuButtonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLogout = () => {
    setShowDropdown(false);
    onLogout();
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-amber-100 border-t border-amber-200"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-4 py-2 border-t-1 border-emerald-900 relative">
        {/* Home */}
        <div
          className={`flex flex-row items-center p-2 cursor-pointer transition-colors ${
            activeSection === "summary"
              ? "bg-emerald-900 text-amber-100 rounded-full"
              : "text-gray-600 rounded-none hover:text-gray-800"
          }`}
          onClick={() => onSectionChange("summary")}
          aria-label="My Summary"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSectionChange("summary");
            }
          }}
        >
          <Coins
            size={20}
            weight={activeSection === "summary" ? "fill" : "regular"}
            className={activeSection === "summary" ? "text-amber-100" : ""}
          />
          <TypewriterText
            text="My Summary"
            isVisible={activeSection === "summary"}
          />
        </div>

        {/* Goals */}
        <div
          className={`flex flex-row items-center p-2 cursor-pointer transition-colors ${
            activeSection === "goals"
              ? "bg-emerald-900 text-amber-100 rounded-full"
              : "text-gray-600 rounded-none hover:text-gray-800"
          }`}
          onClick={() => onSectionChange("goals")}
          aria-label="Goals"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSectionChange("goals");
            }
          }}
        >
          <Target
            size={20}
            weight={activeSection === "goals" ? "fill" : "regular"}
            className={activeSection === "goals" ? "text-amber-100" : ""}
          />
          <TypewriterText
            text="Goals"
            isVisible={activeSection === "goals"}
          />
        </div>

        {/* Friends */}
        <div
          className={`flex flex-row items-center p-2 cursor-pointer transition-colors ${
            activeSection === "friends"
              ? "bg-emerald-900 text-amber-100 rounded-full"
              : "text-gray-600 rounded-none hover:text-gray-800"
          }`}
          onClick={() => onSectionChange("friends")}
          aria-label="Friends"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSectionChange("friends");
            }
          }}
        >
          <Users
            size={20}
            weight={activeSection === "friends" ? "fill" : "regular"}
            className={activeSection === "friends" ? "text-amber-100" : ""}
          />
          <TypewriterText
            text="Friends"
            isVisible={activeSection === "friends"}
          />
        </div>

        {/* User Menu */}
        <div className="relative" ref={menuButtonRef}>
          <div
            className={`flex flex-row items-center p-2 cursor-pointer transition-colors ${
              showDropdown
                ? "bg-emerald-900 text-amber-100 rounded-full"
                : "text-gray-600 rounded-none hover:text-gray-800"
            }`}
            onClick={handleToggleDropdown}
            aria-label="User Menu"
            aria-expanded={showDropdown}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleDropdown();
              }
              if (e.key === "Escape") {
                setShowDropdown(false);
              }
            }}
          >
            <UserCircle
              size={20}
              weight={showDropdown ? "fill" : "regular"}
              className={showDropdown ? "text-amber-100" : ""}
            />
          </div>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute bottom-full right-0 mb-2 bg-amber-50 border border-emerald-900 rounded-lg shadow-lg min-w-[160px] overflow-hidden"
              role="menu"
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-red-600 hover:text-white transition-colors"
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLogout();
                  }
                }}
              >
                <SignOut size={18} weight="regular" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
