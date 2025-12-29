"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  FriendWithProfile,
  FriendRequestWithProfile,
} from "@/lib/types/friends";
import {
  Users,
  UserPlus,
  Check,
  X,
  Clock,
  Chat,
  UserCircle,
} from "phosphor-react";
import ChatModal from "@/components/friends/ChatModal";

const FriendsSection = () => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequestWithProfile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] =
    useState<FriendWithProfile | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(
    new Set()
  );

  const fetchFriends = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setFriendsLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/friends?userId=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setFriendsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const fetchRequests = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setRequestsLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(
        `/api/friends/requests?userId=${user.uid}&type=received`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter to only show pending requests and remove duplicates
        const pendingRequests = (data.requests || []).filter(
          (req: FriendRequestWithProfile) => req.status === "pending"
        );
        // Remove duplicates by fromUserId
        const uniqueRequests = pendingRequests.filter(
          (
            req: FriendRequestWithProfile,
            index: number,
            self: FriendRequestWithProfile[]
          ) => index === self.findIndex((r) => r.fromUserId === req.fromUserId)
        );
        setRequests(uniqueRequests);
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    } finally {
      setRequestsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  const handleRespondToRequest = async (
    requestId: string,
    action: "accept" | "decline"
  ) => {
    if (!user?.uid || processingRequests.has(requestId)) return;

    setProcessingRequests((prev) => new Set(prev).add(requestId));

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
          action,
          fromUserId: user.uid,
          toUserId: user.uid,
          requestId,
        }),
      });

      if (response.ok) {
        setRequests((prev) => prev.filter((req) => req.id !== requestId));
        if (action === "accept") {
          fetchFriends(); // Refresh friends list
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
    } finally {
      setProcessingRequests((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // Show only first 3 friends
  const displayedFriends = friends.slice(0, 3);
  const hasMoreFriends = friends.length > 3;

  return (
    <div className="space-y-6">
      {/* Friends Section */}
      <div>
        <div className="flex items-center space-x-2 sm:space-x-3 mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users
              size={20}
              className="text-amber-100 sm:w-5 sm:h-5"
              weight="fill"
            />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Friends
          </h2>
          {friends.length > 0 && (
            <span className="text-xs sm:text-sm text-gray-600">
              ({friends.length})
            </span>
          )}
        </div>

        {friendsLoading ? (
          <div className="bg-amber-100 border border-emerald-900 rounded-lg p-4">
            <div className="animate-pulse space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                    <div className="h-3 bg-gray-300 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : friends.length === 0 ? (
          <div className="bg-amber-100 border border-emerald-900 rounded-lg p-6 text-center">
            <Users
              size={32}
              className="mx-auto text-gray-400 mb-2"
              weight="thin"
            />
            <p className="text-xs text-gray-600">No friends yet</p>
          </div>
        ) : (
          <div className="bg-amber-100 border border-emerald-900 rounded-lg p-4 space-y-3">
            {displayedFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {friend.friendProfile.photoURL ? (
                    <img
                      src={friend.friendProfile.photoURL}
                      alt={friend.friendProfile.displayName || "User"}
                      className="w-10 h-10 rounded-full border-2 border-emerald-900 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserCircle
                        size={20}
                        className="text-amber-100"
                        weight="fill"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {friend.friendProfile.displayName || "Anonymous User"}
                    </p>
                    {friend.friendProfile.email && (
                      <p className="text-xs text-gray-600 truncate">
                        {friend.friendProfile.email}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedFriend(friend);
                    setIsChatOpen(true);
                  }}
                  className="p-2 bg-emerald-900 text-amber-100 rounded-lg hover:bg-emerald-800 transition-colors flex-shrink-0"
                  aria-label="Start chat"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedFriend(friend);
                      setIsChatOpen(true);
                    }
                  }}
                >
                  <Chat size={16} weight="fill" />
                </button>
              </div>
            ))}
            {hasMoreFriends && (
              <p className="text-xs text-gray-600 text-center pt-2">
                +{friends.length - 3} more friends
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pending Requests Section */}
      {requests.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <UserPlus
                size={20}
                className="text-amber-100 sm:w-5 sm:h-5"
                weight="fill"
              />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Pending Requests
            </h2>
            <span className="text-xs sm:text-sm text-gray-600">
              ({requests.length})
            </span>
          </div>

          {requestsLoading ? (
            <div className="bg-amber-100 border border-emerald-900 rounded-lg p-4">
              <div className="animate-pulse space-y-3">
                {[...Array(1)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                      <div className="h-3 bg-gray-300 rounded w-32"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-amber-100 border border-emerald-900 rounded-lg p-4 space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {request.fromUserProfile.photoURL ? (
                      <img
                        src={request.fromUserProfile.photoURL}
                        alt={request.fromUserProfile.displayName || "User"}
                        className="w-10 h-10 rounded-full border-2 border-emerald-900 object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle
                          size={20}
                          className="text-amber-100"
                          weight="fill"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {request.fromUserProfile.displayName ||
                          "Anonymous User"}
                      </p>
                      {request.fromUserProfile.email && (
                        <p className="text-xs text-gray-600 truncate">
                          {request.fromUserProfile.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        handleRespondToRequest(request.id, "accept")
                      }
                      disabled={processingRequests.has(request.id)}
                      className="p-2 bg-emerald-900 text-amber-100 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Accept request"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRespondToRequest(request.id, "accept");
                        }
                      }}
                    >
                      <Check size={16} weight="bold" />
                    </button>
                    <button
                      onClick={() =>
                        handleRespondToRequest(request.id, "decline")
                      }
                      disabled={processingRequests.has(request.id)}
                      className="p-2 bg-red-900 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Decline request"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRespondToRequest(request.id, "decline");
                        }
                      }}
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

export default FriendsSection;
