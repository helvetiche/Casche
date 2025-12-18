"use client";

import { useState, useEffect } from "react";
import { Coins, Bank, Users } from "phosphor-react";

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
}

const BottomNavigation = ({
  activeSection,
  onSectionChange,
}: BottomNavigationProps) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-amber-100 border-t border-amber-200"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-4 py-2 border-t-1 border-emerald-900">
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

        {/* My Savings */}
        <div
          className={`flex flex-row items-center p-2 cursor-pointer transition-colors ${
            activeSection === "savings"
              ? "bg-emerald-900 text-amber-100 rounded-full"
              : "text-gray-600 rounded-none hover:text-gray-800"
          }`}
          onClick={() => onSectionChange("savings")}
          aria-label="My Savings"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSectionChange("savings");
            }
          }}
        >
          <Bank
            size={20}
            weight={activeSection === "savings" ? "fill" : "regular"}
            className={activeSection === "savings" ? "text-amber-100" : ""}
          />
          <TypewriterText
            text="My Savings"
            isVisible={activeSection === "savings"}
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
      </div>
    </nav>
  );
};

export default BottomNavigation;
