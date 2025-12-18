"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Coins, Bank, ChartBar, Gear } from "phosphor-react";

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
    <span className="text-xs ml-2 font-medium font-mono">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

const BottomNavigation = () => {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string>("summary");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-amber-100 border-t border-amber-200"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-4 py-2">
        {/* Home */}
        <div
          className={`flex flex-row items-center p-2 rounded-none cursor-pointer ${
            activeSection === "summary" ? "text-emerald-900" : "text-gray-600"
          }`}
          onClick={() => setActiveSection("summary")}
          aria-label="My Summary"
        >
          <Coins
            size={20}
            weight={activeSection === "summary" ? "fill" : "regular"}
          />
          <TypewriterText
            text="[ My Summary ]"
            isVisible={activeSection === "summary"}
          />
        </div>

        {/* My Savings */}
        <div
          className={`flex flex-row items-center p-2 rounded-none cursor-pointer ${
            activeSection === "savings" ? "text-emerald-900" : "text-gray-600"
          }`}
          onClick={() => setActiveSection("savings")}
          aria-label="My Savings"
        >
          <Bank
            size={20}
            weight={activeSection === "savings" ? "fill" : "regular"}
          />
          <TypewriterText
            text="[ My Savings ]"
            isVisible={activeSection === "savings"}
          />
        </div>

        {/* Analytics */}
        <div
          className={`flex flex-row items-center p-2 rounded-none cursor-pointer ${
            activeSection === "analytics"
              ? "text-emerald-900"
              : "text-gray-600 "
          }`}
          onClick={() => setActiveSection("analytics")}
          aria-label="Analytics"
        >
          <ChartBar
            size={20}
            weight={activeSection === "analytics" ? "fill" : "regular"}
          />
          <TypewriterText
            text="[ Analytics ] "
            isVisible={activeSection === "analytics"}
          />
        </div>

        {/* Settings */}
        <div
          className={`flex flex-row items-center p-2 rounded-none cursor-pointer transition-colors ${
            activeSection === "settings" ? "text-emerald-900" : "text-gray-600"
          }`}
          onClick={() => setActiveSection("settings")}
          aria-label="Settings"
        >
          <Gear
            size={20}
            weight={activeSection === "settings" ? "fill" : "regular"}
          />
          <TypewriterText
            text="[ Settings ]"
            isVisible={activeSection === "settings"}
          />
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
