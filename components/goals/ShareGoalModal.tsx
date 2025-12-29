"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Goal } from "@/lib/types/goals";
import { UserProfile } from "@/lib/types/friends";
import { X, UserCircle, Check } from "phosphor-react";
import ModalPortal from "./ModalPortal";
import AlertModal from "./AlertModal";

interface ShareGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onShare: () => void;
}

const ShareGoalModal = ({
  isOpen,
  onClose,
  goal,
  onShare,
}: ShareGoalModalProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  useEffect(() => {
    if (isOpen && user?.uid) {
      fetchFriends();
    }
  }, [isOpen, user?.uid]);

  const fetchFriends = async () => {
    try {
      setLoadingFriends(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/friends?userId=${user!.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(
          data.friends.map((f: any) => f.friendProfile as UserProfile)
        );

        // Fetch existing members to exclude them
        if (goal) {
          const goalResponse = await fetch(`/api/goals/${goal.id}`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });

          if (goalResponse.ok) {
            const goalData = await goalResponse.json();
            const memberIds = new Set(
              goalData.members?.map((m: any) => m.userId) || []
            );
            // Filter out existing members
            setFriends((prev) => prev.filter((f) => !memberIds.has(f.uid)));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleShare = async () => {
    if (!goal || selectedFriends.size === 0) {
      setAlert({
        isOpen: true,
        title: "No Friends Selected",
        message: "Please select at least one friend to share this goal with",
        type: "error",
      });
      return;
    }

    setSending(true);

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setAlert({
          isOpen: true,
          title: "Authentication Required",
          message: "Please sign in to continue",
          type: "error",
        });
        setSending(false);
        return;
      }

      const promises = Array.from(selectedFriends).map(async (friendId) => {
        const response = await fetch(`/api/goals/${goal.id}/share`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ toUserId: friendId }),
        });

        const data = await response.json();
        return { response, data, friendId };
      });

      const results = await Promise.all(promises);

      // Separate successful, already-sent/already-member, and actual errors
      const successful: string[] = [];
      const skipped: string[] = [];
      const failed: { friendId: string; error: string }[] = [];

      results.forEach(({ response, data, friendId }) => {
        if (response.ok) {
          successful.push(friendId);
        } else if (
          response.status === 400 &&
          (data.error?.includes("already a member") ||
            data.error?.includes("already sent") ||
            data.error?.includes("already a member of this goal") ||
            data.error?.includes("Sharing request already sent"))
        ) {
          // These are not really errors - just skip them
          console.log(`Skipping friend ${friendId}: ${data.error}`);
          skipped.push(friendId);
        } else {
          console.error(`Failed to share with friend ${friendId}:`, {
            status: response.status,
            error: data.error,
            data,
          });
          failed.push({
            friendId,
            error: data.error || "Unknown error",
          });
        }
      });

      // Show appropriate message
      if (failed.length > 0) {
        const errorMsg =
          failed.length === results.length
            ? "Failed to send sharing requests"
            : `Failed to send ${failed.length} of ${results.length} requests`;
        setAlert({
          isOpen: true,
          title: "Sharing Failed",
          message: errorMsg,
          type: "error",
        });
      } else if (successful.length > 0) {
        const message =
          skipped.length > 0
            ? `Sent ${successful.length} request(s) successfully. ${skipped.length} friend(s) already have access or pending requests.`
            : "Sharing requests sent successfully!";
        setAlert({
          isOpen: true,
          title: "Success",
          message: message,
          type: "success",
        });
      } else if (skipped.length > 0) {
        setAlert({
          isOpen: true,
          title: "Already Shared",
          message:
            "All selected friends already have access or have pending requests.",
          type: "info",
        });
      }

      // Only close if we had at least some success or all were skipped
      if (
        successful.length > 0 ||
        (skipped.length > 0 && failed.length === 0)
      ) {
        setSelectedFriends(new Set());
        onShare();
        onClose();
      }
    } catch (error) {
      console.error("Error sharing goal:", error);
      setAlert({
        isOpen: true,
        title: "Sharing Failed",
        message: "Failed to send sharing requests",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !goal) return null;

  return (
    <>
      <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-amber-50 border border-emerald-900 rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-emerald-900">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Share Goal
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClose();
                  }
                }}
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">Goal</div>
                <div className="flex items-center space-x-3">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "You"}
                      className="w-10 h-10 rounded-full object-cover border-2 border-emerald-900"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-900">
                      <UserCircle
                        size={20}
                        className="text-emerald-900"
                        weight="fill"
                      />
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Sharing as {user?.displayName || "You"}
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {goal.title}
                    </div>
                  </div>
                </div>
              </div>

              {loadingFriends ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Friends
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 animate-pulse"
                      >
                        <div className="w-4 h-4 bg-gray-300 rounded"></div>
                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">
                    No friends available to share with. Add friends first!
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Friends
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {friends.map((friend) => (
                        <label
                          key={friend.uid}
                          className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg cursor-pointer border border-transparent hover:border-gray-300 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFriends.has(friend.uid)}
                            onChange={() => toggleFriend(friend.uid)}
                            className="rounded"
                          />
                          {friend.photoURL ? (
                            <img
                              src={friend.photoURL}
                              alt={friend.displayName || "Friend"}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                              <UserCircle
                                size={20}
                                className="text-emerald-900"
                                weight="fill"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {friend.displayName || "Anonymous User"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {friend.email}
                            </div>
                          </div>
                          {selectedFriends.has(friend.uid) && (
                            <Check
                              size={20}
                              className="text-emerald-900"
                              weight="bold"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={sending || selectedFriends.size === 0}
                      className="px-4 py-2 bg-emerald-900 text-amber-100 rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? "Sending..." : "Send Requests"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </>
  );
};

export default ShareGoalModal;
