"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { FriendWithProfile } from "@/lib/types/friends";
import { Users, Chat, SmileySad, UserCircle } from "phosphor-react";

const FriendsList = () => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchFriends = async () => {
      try {
        setLoading(true);
        const idToken = await getCurrentUserIdToken();
        if (!idToken) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/friends?userId=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch friends");
        }

        const data = await response.json();
        setFriends(data.friends);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch friends"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4 p-4 bg-amber-50 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Error loading friends</div>
        <div className="text-sm text-gray-600">{error}</div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <SmileySad
          size={48}
          className="mx-auto text-gray-400 mb-4"
          weight="thin"
        />
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          I think you're lonely.
        </h3>
        <p className="text-gray-600 text-xs">
          Add some friends to share your progress with!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-emerald-900 rounded-none"></div>
        <div className="w-3 h-3 bg-emerald-800 rounded-none"></div>
        <div className="w-3 h-3 bg-emerald-700 rounded-none"></div>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Your Friends ({friends.length})
        </h2>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center justify-between p-3 sm:p-4 bg-amber-50 border border-emerald-900 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              {friend.friendProfile.photoURL ? (
                <img
                  src={friend.friendProfile.photoURL}
                  alt={`${friend.friendProfile.displayName || "User"}'s avatar`}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-amber-900 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCircle
                    size={20}
                    className="text-emerald-900"
                    weight="bold"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {friend.friendProfile.displayName || "Anonymous User"}
                </h3>
              </div>
            </div>

            <button
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-emerald-900 text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors ml-2 flex-shrink-0"
              aria-label={`Start chat with ${
                friend.friendProfile.displayName || "friend"
              }`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  // Handle chat action
                }
              }}
            >
              <Chat size={14} className="text-amber-100" weight="fill" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsList;
