"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { SharedSavingsGoal } from "@/lib/types/savings";
import { Target, UserCircle, X } from "phosphor-react";

const SharedSavingsGoals = () => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [sharedGoals, setSharedGoals] = useState<SharedSavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchSharedGoals = useCallback(async () => {
    try {
      setLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/savings/shared?userId=${user!.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch shared savings goals");
      }

      const data = await response.json();
      setSharedGoals(data.sharedGoals);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch shared savings goals"
      );
    } finally {
      setLoading(false);
    }
  }, [user?.uid, getCurrentUserIdToken]);

  useEffect(() => {
    if (user?.uid) {
      fetchSharedGoals();
    }
  }, [user?.uid, fetchSharedGoals]);

  const handleRemove = async (sharedGoalId: string) => {
    if (!user?.uid) return;

    setRemoving(sharedGoalId);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication required");

      const response = await fetch(
        `/api/savings/shared?sharedGoalId=${sharedGoalId}&userId=${user.uid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove shared goal");
      }

      // Update local state
      setSharedGoals((prev) => prev.filter((goal) => goal.id !== sharedGoalId));
    } catch (error) {
      console.error("Error removing shared goal:", error);
      alert(
        error instanceof Error ? error.message : "Failed to remove shared goal"
      );
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-amber-50 rounded-lg border border-gray-200 p-4">
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                <div className="h-2 bg-gray-300 rounded"></div>
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
        <div className="text-red-500 mb-2">Error loading shared goals</div>
        <div className="text-sm text-black">{error}</div>
      </div>
    );
  }

  if (sharedGoals.length === 0) {
    return (
      <div className="text-center py-12">
        <Target size={48} className="mx-auto text-black mb-4" weight="thin" />
        <h3 className="text-sm font-medium text-black mb-2">
          No shared savings goals
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Friends&apos; Savings Goals ({sharedGoals.length})
        </h2>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {sharedGoals.map((sharedGoal) => {
          const progressPercentage = Math.min(
            (sharedGoal.savingsGoal.currentAmount /
              sharedGoal.savingsGoal.targetAmount) *
              100,
            100
          );
          const isCompleted =
            sharedGoal.savingsGoal.currentAmount >=
            sharedGoal.savingsGoal.targetAmount;

          return (
            <div
              key={sharedGoal.id}
              className="bg-amber-50 rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              {/* Header with owner info and remove button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  {sharedGoal.ownerProfile.photoURL ? (
                    <img
                      src={sharedGoal.ownerProfile.photoURL}
                      alt={`${
                        sharedGoal.ownerProfile.displayName || "User"
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
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sharedGoal.ownerProfile.displayName || "Anonymous User"}
                    </p>
                    <p className="text-xs text-amber-500">
                      Shared{" "}
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                      }).format(sharedGoal.sharedAt)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(sharedGoal.id)}
                  disabled={removing === sharedGoal.id}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50 touch-manipulation self-end sm:self-center"
                  aria-label="Remove shared goal"
                  title="Stop following this goal"
                >
                  {removing === sharedGoal.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <X size={16} weight="bold" />
                  )}
                </button>
              </div>

              {/* Goal content */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {sharedGoal.savingsGoal.title}
                  </h3>
                  {sharedGoal.savingsGoal.description && (
                    <p className="text-sm text-black">
                      {sharedGoal.savingsGoal.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black">Progress</span>
                    <span
                      className={`font-medium ${
                        isCompleted ? "text-emerald-600" : "text-gray-900"
                      }`}
                    >
                      {progressPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted ? "bg-emerald-500" : "bg-emerald-400"
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(sharedGoal.savingsGoal.currentAmount)}
                    </div>
                    <div className="text-xs text-amber-500 uppercase tracking-wide">
                      Saved
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(sharedGoal.savingsGoal.targetAmount)}
                    </div>
                    <div className="text-xs text-amber-500 uppercase tracking-wide">
                      Target
                    </div>
                  </div>
                </div>

                {/* Category */}
                {sharedGoal.savingsGoal.category && (
                  <div className="flex justify-center">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs text-black">
                      {sharedGoal.savingsGoal.category}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SharedSavingsGoals;
