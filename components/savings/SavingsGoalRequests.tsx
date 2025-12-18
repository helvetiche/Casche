"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { SavingsGoalRequestWithProfiles } from "@/lib/types/savings";
import { Check, X, Clock, UserCircle } from "phosphor-react";

const SavingsGoalRequests = () => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [requests, setRequests] = useState<SavingsGoalRequestWithProfiles[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/savings/requests?userId=${user!.uid}&type=received`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch savings goal requests");
      }

      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch savings goal requests"
      );
    } finally {
      setLoading(false);
    }
  }, [user?.uid, getCurrentUserIdToken]);

  useEffect(() => {
    if (user?.uid) {
      fetchRequests();
    }
  }, [user?.uid, fetchRequests]);

  const handleRespond = async (
    request: SavingsGoalRequestWithProfiles,
    action: "accept" | "decline"
  ) => {
    if (!user?.uid) return;

    setProcessing(request.id);
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
          action,
          fromUserId: user.uid,
          toUserId: user.uid,
          savingsGoalId: request.savingsGoal.id,
          requestId: request.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} request`);
      }

      // Update the local state
      setRequests((prev) => prev.filter((req) => req.id !== request.id));
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(
        error instanceof Error ? error.message : `Failed to ${action} request`
      );
    } finally {
      setProcessing(null);
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

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Error loading requests</div>
        <div className="text-sm text-black">{error}</div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock size={48} className="mx-auto text-black mb-4" weight="thin" />
        <h3 className="text-sm font-medium text-black mb-2">
          No pending requests
        </h3>
        <p className="text-black text-xs">
          When friends share their savings goals with you, they&apos;ll appear
          here.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (date?: Date | any) => {
    if (!date) return null;

    try {
      // Handle Firestore timestamp
      if (date && typeof date === "object" && "seconds" in date) {
        date = new Date(date.seconds * 1000);
      }

      // Handle string dates
      if (typeof date === "string") {
        date = new Date(date);
      }

      // Ensure it's a valid Date object
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
      }

      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Savings Goal Requests ({requests.length})
        </h2>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-amber-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4 min-w-0 flex-1">
                {request.fromUserProfile.photoURL ? (
                  <img
                    src={request.fromUserProfile.photoURL}
                    alt={`${
                      request.fromUserProfile.displayName || "User"
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
                  <p className="text-sm text-black">
                    <span className="font-medium text-gray-900">
                      {request.fromUserProfile.displayName || "A friend"}
                    </span>{" "}
                    wants to share their savings goal with you
                  </p>
                  <p className="text-xs text-amber-500">
                    {formatDate(request.createdAt)}
                  </p>
                  <p className="text-xs text-amber-500">
                    {request.fromUserProfile.displayName || "A friend"} wants to
                    share their savings goal with you
                  </p>
                </div>
              </div>
            </div>

            {/* Savings Goal Preview */}
            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {request.savingsGoal.title}
              </h4>
              {request.savingsGoal.description && (
                <p className="text-sm text-black mb-3">
                  {request.savingsGoal.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-black">
                  Target: {formatCurrency(request.savingsGoal.targetAmount)}
                </span>
                {request.savingsGoal.category && (
                  <span className="bg-gray-200 px-2 py-1 rounded-full text-xs">
                    {request.savingsGoal.category}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:space-x-3">
              <button
                onClick={() => handleRespond(request, "accept")}
                disabled={processing === request.id}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 sm:py-2 bg-emerald-600 text-amber-100 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-medium touch-manipulation"
              >
                {processing === request.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Accepting...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} weight="bold" />
                    <span>Accept</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleRespond(request, "decline")}
                disabled={processing === request.id}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 sm:py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm font-medium touch-manipulation"
              >
                <X size={16} weight="bold" />
                <span>Decline</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavingsGoalRequests;
