"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { FriendWithProfile } from "@/lib/types/friends";
import { Users, Chat, UserCircle } from "phosphor-react";
import ChatModal from "./ChatModal";

const FriendsList = () => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] =
    useState<FriendWithProfile | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

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

                {/* Chat Button */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-full flex-shrink-0 ml-2"></div>
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {friends.length === 0 ? (
        <div className="text-center py-12">
          <Users
            size={48}
            className="mx-auto text-gray-400 mb-3 sm:mb-4 sm:w-16 sm:h-16"
            weight="thin"
          />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1.5 sm:mb-2">
            No friends yet
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 px-2">
            Add some friends to share your progress with!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  {friend.friendProfile.photoURL ? (
                    <img
                      src={friend.friendProfile.photoURL}
                      alt={`${
                        friend.friendProfile.displayName || "User"
                      }'s avatar`}
                      className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full border-2 border-emerald-900 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-emerald-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserCircle
                        size={24}
                        className="text-amber-100 sm:w-7 sm:h-7"
                        weight="fill"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
                      {friend.friendProfile.displayName || "Anonymous User"}
                    </h3>
                    {friend.friendProfile.email && (
                      <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5 sm:mt-1">
                        {friend.friendProfile.email}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  className="p-2 sm:px-3 sm:py-2 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors flex-shrink-0 ml-2"
                  aria-label={`Start chat with ${
                    friend.friendProfile.displayName || "friend"
                  }`}
                  tabIndex={0}
                  onClick={() => {
                    setSelectedFriend(friend);
                    setIsChatOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedFriend(friend);
                      setIsChatOpen(true);
                    }
                  }}
                >
                  <Chat size={16} weight="fill" className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Modal */}
      {selectedFriend && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setSelectedFriend(null);
          }}
          friend={selectedFriend.friendProfile}
        />
      )}
    </div>
  );
};

export default FriendsList;
