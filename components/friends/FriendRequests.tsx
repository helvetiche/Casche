"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { FriendRequestWithProfile } from "@/lib/types/friends";
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

      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
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
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
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

  const pendingRequests = requests.filter(
    (req) => req && req.status === "pending"
  );

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-12">
        <X size={48} className="mx-auto text-black mb-4" weight="thin" />
        <h3 className="text-md font-medium text-gray-900 mb-2">
          Nobody has sent you any friend requests yet.
        </h3>
        <p className="text-gray-600 text-xs">
          You're all caught up! No friend requests to review. Go add some
          friends!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-emerald-900 rounded-none"></div>
        <div className="w-3 h-3 bg-emerald-800 rounded-none"></div>
        <div className="w-3 h-3 bg-emerald-700 rounded-none"></div>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Friend Requests ({pendingRequests.length})
        </h2>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-amber-50 rounded-lg border border-gray-200 space-y-3 sm:space-y-0"
          >
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              {request.fromUserProfile?.photoURL ? (
                <img
                  src={request.fromUserProfile.photoURL}
                  alt={`${
                    request.fromUserProfile.displayName || "User"
                  }'s avatar`}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserPlus
                    size={20}
                    className="text-emerald-900"
                    weight="bold"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {request.fromUserProfile?.displayName || "Anonymous User"}
                </h3>
                <p className="text-xs text-amber-500">
                  {" "}
                  {request.createdAt
                    ? formatReadableDate(request.createdAt)
                    : "Unknown date"}
                </p>
              </div>
            </div>

            <div className="flex sm:justify-end space-x-2 flex-shrink-0">
              {processingRequests.has(request.id) ? (
                <div className="flex items-center space-x-2 text-amber-500">
                  <div className="animate-spin rounded-none h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                  <span className="text-xs sm:text-sm font-medium">
                    Processing...
                  </span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleRespondToRequest(request.id, "accept")}
                    className="flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2.5 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 active:bg-emerald-950 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-xs sm:text-xs"
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
                    className="flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-2.5 bg-amber-50 text-gray-700 rounded-full border border-gray-300 hover:bg-amber-50 hover:border-gray-400 active:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-xs sm:text-xs"
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
