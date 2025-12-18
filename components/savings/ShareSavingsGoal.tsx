"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  SavingsGoal,
  SavingsGoalRequestWithProfiles,
} from "@/lib/types/savings";
import { FriendWithProfile } from "@/lib/types/friends";
import { X, Share, UserCircle } from "phosphor-react";

interface ShareSavingsGoalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
}

const ShareSavingsGoal = ({ isOpen, onClose, goal }: ShareSavingsGoalProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set());

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/friends?userId=${user!.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);

        // Check which friends already have this goal shared
        if (goal) {
          const sharedResponse = await fetch(
            `/api/savings/requests?userId=${user!.uid}&type=sent`,
            {
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            }
          );

          if (sharedResponse.ok) {
            const sharedData = await sharedResponse.json();
            const alreadyShared = new Set<string>(
              (sharedData.requests as SavingsGoalRequestWithProfiles[])
                .filter(
                  (req) =>
                    req.savingsGoal.id === goal.id && req.status === "pending"
                )
                .map((req) => req.toUserId)
            );
            setSharedWith(alreadyShared);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, goal?.id, getCurrentUserIdToken]);

  useEffect(() => {
    if (isOpen && user?.uid) {
      fetchFriends();
    }
  }, [isOpen, user?.uid, fetchFriends]);

  const handleShare = async (friendId: string) => {
    if (!goal || !user?.uid) return;

    setSharing(friendId);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication required");

      const response = await fetch("/api/savings/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "send",
          fromUserId: user.uid,
          toUserId: friendId,
          savingsGoalId: goal.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to share savings goal");
      }

      setSharedWith((prev) => new Set([...prev, friendId]));
      alert("Savings goal shared successfully!");
    } catch (error) {
      console.error("Error sharing savings goal:", error);
      alert(
        error instanceof Error ? error.message : "Failed to share savings goal"
      );
    } finally {
      setSharing(null);
    }
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-amber-50 rounded-lg max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Share Savings Goal
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            aria-label="Close modal"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{goal.title}</h3>
            <p className="text-sm text-gray-600">
              Share this goal with your friends so they can follow your
              progress!
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center space-x-3 p-3"
                >
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <UserCircle
                size={48}
                className="mx-auto text-gray-400 mb-4"
                weight="thin"
              />
              <p className="text-gray-600 text-sm">
                No friends to share with. Add some friends first!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => {
                const isShared = sharedWith.has(friend.friendId);
                const isSharing = sharing === friend.friendId;

                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      {friend.friendProfile.photoURL ? (
                        <img
                          src={friend.friendProfile.photoURL}
                          alt={`${
                            friend.friendProfile.displayName || "User"
                          }'s avatar`}
                          className="w-12 h-12 rounded-full border-3 border-emerald-900 shadow-md object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-amber-50 border-3 border-emerald-900 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                          <UserCircle
                            size={18}
                            className="text-emerald-900"
                            weight="bold"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {friend.friendProfile.displayName || "Anonymous User"}
                        </h4>
                        <p className="text-xs text-amber-500 truncate">
                          {friend.friendProfile.email}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleShare(friend.friendId)}
                      disabled={isShared || isSharing}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        isShared
                          ? "bg-emerald-100 text-emerald-700 cursor-not-allowed"
                          : "bg-emerald-600 text-amber-100 hover:bg-emerald-700 disabled:opacity-50"
                      }`}
                    >
                      {isSharing ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                          <span>Sharing...</span>
                        </>
                      ) : isShared ? (
                        <>
                          <Share size={14} weight="fill" />
                          <span>Shared</span>
                        </>
                      ) : (
                        <>
                          <Share size={14} weight="bold" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareSavingsGoal;
