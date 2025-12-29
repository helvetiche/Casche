"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/lib/types/friends";
import { UserPlus, MagnifyingGlass, Check, Clock } from "phosphor-react";

const AddFriend = () => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(
    new Set()
  );
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(
    new Set()
  );
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch existing pending requests on component mount
  useEffect(() => {
    if (!user?.uid) return;

    const fetchPendingRequests = async () => {
      try {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) {
          console.error("No ID token available");
          return;
        }

        const response = await fetch(
          `/api/friends/requests?userId=${user.uid}&type=sent`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch pending requests");
        }

        const data = await response.json();
        const pendingUserIds = new Set<string>();
        data.requests
          .filter((req: any) => req.status === "pending")
          .forEach((req: any) => {
            if (req.toUserId) {
              pendingUserIds.add(req.toUserId);
            }
          });
        setPendingRequests(pendingUserIds);
      } catch (error) {
        console.error("Error fetching pending requests:", error);
      }
    };

    fetchPendingRequests();
  }, [user?.uid]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        const idToken = await getCurrentUserIdToken();
        if (!idToken) {
          console.error("No ID token available");
          setSearchResults([]);
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(
            searchQuery
          )}&currentUserId=${user.uid}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to search users");
        }

        const data = await response.json();
        setSearchResults(data.users);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, user?.uid]);

  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user?.uid || sendingRequests.has(targetUserId)) return;

    setSendingRequests((prev) => new Set(prev).add(targetUserId));

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "send",
          fromUserId: user.uid,
          toUserId: targetUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send friend request");
      }

      setSentRequests((prev) => new Set(prev).add(targetUserId));
      setPendingRequests((prev) => new Set(prev).add(targetUserId));
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert(
        error instanceof Error ? error.message : "Failed to send friend request"
      );
    } finally {
      setSendingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search Bar */}
      <div className="bg-amber-100 border border-emerald-900 rounded-full p-1 sm:p-4">
        <div className="relative">
          <MagnifyingGlass
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            weight="regular"
          />
          <input
            type="text"
            placeholder="Search by email or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1 sm:py-2 bg-white border border-emerald-900 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-base"
            aria-label="Search for users to add as friends"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4 lg:p-6"
                >
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gray-300 rounded-full border-2 border-gray-300 flex-shrink-0"></div>

                        {/* Name and Email */}
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-4 sm:h-5 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-3 sm:h-4 bg-gray-300 rounded w-full"></div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="h-8 sm:h-9 bg-gray-300 rounded-full w-24 sm:w-32 flex-shrink-0 ml-2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <MagnifyingGlass
                size={48}
                className="mx-auto text-gray-400 mb-3 sm:mb-4 sm:w-16 sm:h-16"
                weight="thin"
              />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1.5 sm:mb-2">
                No users found
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 px-2">
                No users found matching "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              {searchResults.map((userProfile) => (
                <div
                  key={userProfile.uid}
                  className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      {userProfile.photoURL ? (
                        <img
                          src={userProfile.photoURL}
                          alt={`${userProfile.displayName || "User"}'s avatar`}
                          className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full border-2 border-emerald-900 object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-emerald-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserPlus
                            size={24}
                            className="text-amber-100 sm:w-7 sm:h-7"
                            weight="fill"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
                          {userProfile.displayName || "Anonymous User"}
                        </h4>
                        {userProfile.email && (
                          <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5 sm:mt-1">
                            {userProfile.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center ml-2 flex-shrink-0">
                      {pendingRequests.has(userProfile.uid) ? (
                        <div className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 bg-amber-100 text-emerald-900 border border-emerald-900 rounded-full">
                          <Clock
                            size={14}
                            weight="bold"
                            className="sm:w-4 sm:h-4"
                          />
                          <span className="text-xs sm:text-sm font-medium">
                            Pending
                          </span>
                        </div>
                      ) : sentRequests.has(userProfile.uid) ? (
                        <div className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 bg-emerald-900 text-amber-100 rounded-full">
                          <Check
                            size={14}
                            weight="bold"
                            className="sm:w-4 sm:h-4"
                          />
                          <span className="text-xs sm:text-sm font-medium">
                            Sent
                          </span>
                        </div>
                      ) : sendingRequests.has(userProfile.uid) ? (
                        <div className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 bg-amber-100 text-emerald-900 border border-emerald-900 rounded-full">
                          <div className="animate-spin rounded-none h-3 w-3 sm:h-4 sm:w-4 border-2 border-emerald-900 border-t-transparent"></div>
                          <span className="text-xs sm:text-sm font-medium">
                            Sending...
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            handleSendFriendRequest(userProfile.uid)
                          }
                          className="flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors font-medium text-xs sm:text-sm"
                          aria-label={`Send friend request to ${
                            userProfile.displayName || userProfile.email
                          }`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSendFriendRequest(userProfile.uid);
                            }
                          }}
                        >
                          <UserPlus size={16} weight="bold" />
                          <span className="hidden sm:inline">Add Friend</span>
                          <span className="sm:hidden">Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Default State */}
      {searchQuery.length < 2 && (
        <div className="text-center py-12">
          <UserPlus
            size={48}
            className="mx-auto text-gray-400 mb-3 sm:mb-4 sm:w-16 sm:h-16"
            weight="thin"
          />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1.5 sm:mb-2">
            Start connecting with your friends!
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 px-2">
            Search by email or name to add friends and share your progress with!
          </p>
        </div>
      )}
    </div>
  );
};

export default AddFriend;
