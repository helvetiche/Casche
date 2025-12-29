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
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users
              size={20}
              className="text-amber-100 sm:w-6 sm:h-6"
              weight="fill"
            />
          </div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">
            Friends
          </h1>
        </div>
        <p className="text-xs sm:text-sm lg:text-base text-gray-600">
          Connect with friends and share your savings journey together.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 sm:mb-6">
        <nav className="flex items-center justify-around px-1 sm:px-2 py-1.5 sm:py-2 bg-amber-100 rounded-full border border-emerald-900">
          <div className="flex items-center justify-around w-full gap-0.5 sm:gap-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <div
                  key={tab.id}
                  className={`flex flex-row items-center justify-center p-1.5 sm:p-2 cursor-pointer transition-colors rounded-full flex-1 min-w-0 ${
                    activeTab === tab.id
                      ? "bg-emerald-900 text-amber-100"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-label={tab.label}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveTab(tab.id);
                    }
                  }}
                >
                  <IconComponent
                    size={14}
                    weight={activeTab === tab.id ? "fill" : "regular"}
                    className={`flex-shrink-0 ${
                      activeTab === tab.id ? "text-amber-100" : ""
                    }`}
                  />
                  <span className="ml-1 sm:ml-1.5 text-[10px] sm:text-xs truncate">
                    {tab.label}
                  </span>
                </div>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default FriendsPage;
