"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { FriendRequestWithProfile } from "@/lib/types/friends";
import { getCSRFToken } from "@/lib/api-client";
import { formatReadableDate } from "@/lib/utils";
import { UserPlus, Check, X, Clock } from "phosphor-react";

const FriendRequests = () => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [requests, setRequests] = useState<FriendRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!user?.uid) return;

    const fetchRequests = async () => {
      try {
        setLoading(true);
        const idToken = await getCurrentUserIdToken();
        if (!idToken) {
          console.error("No ID token available");
          setRequests([]);
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/friends/requests?userId=${user.uid}&type=received`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch friend requests");
        }

        const data = await response.json();
        console.log("Friend requests data:", data); // Debug log
        setRequests(data.requests || []);
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();

    // Set up polling for real-time updates
    const interval = setInterval(fetchRequests, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user?.uid]);

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

      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        alert("Failed to get security token. Please refresh the page.");
        return;
      }

      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          action,
          fromUserId: user.uid,
          toUserId: user.uid, // The current user is the recipient
          requestId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to ${action} friend request`
        );
      }

      // Remove the request from the list
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      alert(
        error instanceof Error
          ? error.message
          : `Failed to ${action} friend request`
      );
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4 lg:p-6"
          >
            <div className="animate-pulse space-y-4">
              {/* Avatar + Name + Email + Date */}
              <div className="flex items-start space-x-3 sm:space-x-4">
                {/* Avatar */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gray-300 rounded-full border-2 border-gray-300 flex-shrink-0"></div>

                {/* Name, Email, Date */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 sm:h-5 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 sm:h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-3 bg-gray-300 rounded w-24"></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                <div className="flex-1 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const pendingRequests = requests.filter(
    (req) => req && req.status === "pending"
  );

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock
          size={48}
          className="mx-auto text-gray-400 mb-3 sm:mb-4 sm:w-16 sm:h-16"
          weight="thin"
        />
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1.5 sm:mb-2">
          No friend requests
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 px-2">
          You're all caught up! No friend requests to review. Go add some
          friends!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow"
          >
            {/* Header */}

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                {request.fromUserProfile?.photoURL ? (
                  <img
                    src={request.fromUserProfile.photoURL}
                    alt={`${
                      request.fromUserProfile.displayName || "User"
                    }'s avatar`}
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
                  <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
                    {request.fromUserProfile?.displayName || "Anonymous User"}
                  </h3>
                  {request.fromUserProfile?.email && (
                    <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5 sm:mt-1">
                      {request.fromUserProfile.email}
                    </p>
                  )}
                  {request.createdAt && (
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-1.5">
                      {formatReadableDate(request.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {processingRequests.has(request.id) ? (
                <div className="flex items-center justify-center space-x-2 w-full py-2 bg-amber-100 text-emerald-900 border border-emerald-900 rounded-full">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-900 border-t-transparent"></div>
                  <span className="text-xs sm:text-sm font-medium">
                    Processing...
                  </span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleRespondToRequest(request.id, "accept")}
                    className="flex-1 flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors font-medium text-xs sm:text-sm"
                    aria-label={`Accept friend request from ${
                      request.fromUserProfile?.displayName ||
                      request.fromUserProfile?.email ||
                      "user"
                    }`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRespondToRequest(request.id, "accept");
                      }
                    }}
                  >
                    <Check size={16} weight="bold" />
                    <span>Accept</span>
                  </button>

                  <button
                    onClick={() =>
                      handleRespondToRequest(request.id, "decline")
                    }
                    className="flex-1 flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 bg-white text-emerald-900 border border-emerald-900 rounded-full hover:bg-amber-50 transition-colors font-medium text-xs sm:text-sm"
                    aria-label={`Decline friend request from ${
                      request.fromUserProfile?.displayName ||
                      request.fromUserProfile?.email ||
                      "user"
                    }`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRespondToRequest(request.id, "decline");
                      }
                    }}
                  >
                    <X size={16} weight="bold" />
                    <span>Decline</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendRequests;
