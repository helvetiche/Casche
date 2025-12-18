"use client";

import { useState } from "react";
import { FriendsList, AddFriend, FriendRequests } from "./index";
import { UserPlus, Users, Clock } from "phosphor-react";

type FriendsTab = "friends" | "add" | "requests";

const FriendsPage = () => {
  const [activeTab, setActiveTab] = useState<FriendsTab>("friends");

  const tabs = [
    {
      id: "friends" as FriendsTab,
      label: "My Friends",
      icon: Users,
      component: FriendsList,
    },
    {
      id: "add" as FriendsTab,
      label: "Add Friends",
      icon: UserPlus,
      component: AddFriend,
    },
    {
      id: "requests" as FriendsTab,
      label: "Requests",
      icon: Clock,
      component: FriendRequests,
    },
  ];

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || FriendsList;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-emerald-900 text-amber-100 px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      {/* Tab Navigation */}
      <div className="mb-6 sm:mb-8">
        <div className=" rounded-lg">
          <nav
            className="flex space-x-2 sm:space-x-4 overflow-x-auto"
            aria-label="Friends management tabs"
            role="tablist"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-3 sm:px-4 font-medium text-xs sm:text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 amber-50space-nowrap rounded-full ${
                    isActive
                      ? "bg-emerald-900 text-amber-100"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  aria-selected={isActive}
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveTab(tab.id);
                    }
                  }}
                >
                  <Icon
                    size={16}
                    weight={isActive ? "bold" : "regular"}
                    aria-hidden="true"
                    className="flex-shrink-0"
                  />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">
                    {tab.id === "friends"
                      ? "Friends"
                      : tab.id === "add"
                      ? "Add"
                      : tab.id === "requests"
                      ? "Requests"
                      : tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div
        id="main-content"
        className="bg-amber-100 border-1 border-amber-900 p-4 sm:p-6"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        <ActiveComponent />
      </div>
    </div>
  );
};

export default FriendsPage;
