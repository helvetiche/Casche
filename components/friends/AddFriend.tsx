"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/lib/types/friends";
import { UserPlus, MagnifyingGlass, X, Check, Clock } from "phosphor-react";

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
      <div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-emerald-900 rounded-none"></div>
          <div className="w-3 h-3 bg-emerald-800 rounded-none"></div>
          <div className="w-3 h-3 bg-emerald-700 rounded-none"></div>
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
          Start connecting with your friends!
        </h2>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by email or name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border-1 border-amber-900 rounded-lg p-2 "
            aria-label="Search for users to add as friends"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="space-y-3 sm:space-y-4">
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-none h-5 w-5 sm:h-6 sm:w-6 border-2 border-emerald-900 border-t-transparent mx-auto"></div>
            </div>
          )}

          {!loading && searchResults.length === 0 && (
            <div className="text-center py-6 sm:py-8">
              <UserPlus
                size={28}
                className="mx-auto text-gray-400 mb-2"
                weight="thin"
              />
              <p className="text-sm sm:text-base text-gray-600">
                No users found matching "{searchQuery}"
              </p>
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 tracking-wide">
                We found {searchResults.length} results!
              </h3>

              {searchResults.map((userProfile) => (
                <div
                  key={userProfile.uid}
                  className="flex items-center justify-between p-3 sm:p-4 bg-amber-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                    {userProfile.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt={`${userProfile.displayName || "User"}'s avatar`}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserPlus
                          size={16}
                          className="text-emerald-900"
                          weight="bold"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-gray-900 truncate text-sm sm:text-base">
                        {userProfile.displayName || "Anonymous User"}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 sm:space-x-2 ml-2 flex-shrink-0">
                    {pendingRequests.has(userProfile.uid) ? (
                      <div className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-600 text-amber-100 rounded-full">
                        <Clock size={14} weight="bold" />
                        <span className="text-xs sm:text-sm font-medium">
                          Pending
                        </span>
                      </div>
                    ) : sentRequests.has(userProfile.uid) ? (
                      <div className="flex items-center space-x-1 sm:space-x-2 text-emerald-900">
                        <Check size={14} weight="bold" />
                        <span className="text-xs sm:text-sm font-medium">
                          Sent
                        </span>
                      </div>
                    ) : sendingRequests.has(userProfile.uid) ? (
                      <div className="flex items-center space-x-1 sm:space-x-2 text-amber-500">
                        <div className="animate-spin rounded-none h-3 w-3 sm:h-4 sm:w-4 border-2 border-amber-500 border-t-transparent"></div>
                        <span className="text-xs sm:text-sm font-medium">
                          Sending...
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSendFriendRequest(userProfile.uid)}
                        className="flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2.5 bg-emerald-900 text-amber-100 rounded-xl hover:bg-emerald-800 active:bg-emerald-950 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-xs sm:text-sm"
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* Default State */}
      {searchQuery.length < 2 && (
        <div className="text-center py-12">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Connect with your friends!
          </h3>
          <p className="text-gray-600 text-xs">
            Add friends to share your progress with!
          </p>
        </div>
      )}
    </div>
  );
};

export default AddFriend;
