"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Goal,
  GoalTransaction,
  QuickSubmitButton,
  GoalMember,
} from "@/lib/types/goals";
import { UserProfile } from "@/lib/types/friends";
import {
  X,
  Plus,
  Minus,
  Trash,
  UserCircle,
  Calendar,
  Clock,
} from "phosphor-react";
import * as PhosphorIcons from "phosphor-react";
import QuickSubmitManager from "./QuickSubmitManager";
import ModalPortal from "./ModalPortal";
import ConfirmationModal from "./ConfirmationModal";

interface GoalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onUpdate: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onDeposit: (goalId: string, amount: number) => void;
  onWithdraw: (goalId: string, amount: number) => void;
}

const GoalDetailsModal = ({
  isOpen,
  onClose,
  goal,
  onUpdate,
  onDelete,
  onDeposit,
  onWithdraw,
}: GoalDetailsModalProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [members, setMembers] = useState<
    (GoalMember & { userProfile: UserProfile })[]
  >([]);
  const [transactions, setTransactions] = useState<GoalTransaction[]>([]);
  const [quickSubmitButtons, setQuickSubmitButtons] = useState<
    QuickSubmitButton[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && goal) {
      fetchGoalDetails();
    }
  }, [isOpen, goal]);

  const fetchGoalDetails = async () => {
    if (!goal || !user?.uid) return;

    try {
      setLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/goals/${goal.id}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setTransactions(data.transactions || []);
        setQuickSubmitButtons(data.quickSubmitButtons || []);
      }
    } catch (error) {
      console.error("Error fetching goal details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = async (button: QuickSubmitButton) => {
    if (!goal) return;
    await onDeposit(goal.id, button.amount);
    fetchGoalDetails();
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date | undefined | any) => {
    if (!date) return "Unknown date";

    try {
      // Handle Firestore Timestamp
      let dateObj: Date;
      if (date && typeof date === "object" && "seconds" in date) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === "string") {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return "Unknown date";
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "Unknown date";
      }

      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  const getIconComponent = () => {
    if (!goal) return null;
    if (goal.iconType === "phosphor" && goal.iconName) {
      return (PhosphorIcons as any)[goal.iconName] || null;
    }
    return null;
  };

  const IconComponent = goal ? getIconComponent() : null;

  if (!isOpen || !goal) {
    return (
      <>
        {/* Delete Confirmation Modal - can be shown even when main modal is closed */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setGoalToDelete(null);
          }}
          onConfirm={() => {
            if (goalToDelete) {
              onDelete(goalToDelete);
              setShowDeleteConfirm(false);
              setGoalToDelete(null);
              onClose();
            }
          }}
          title="Delete Goal"
          message="Are you sure you want to delete this goal? This action cannot be undone and all associated data will be permanently removed."
          confirmText="Delete"
          cancelText="Cancel"
          confirmButtonColor="danger"
        />
      </>
    );
  }
  const progress = Math.min(
    (goal.currentAmount / goal.targetAmount) * 100,
    100
  );
  const isOwner = goal.userId === user?.uid;

  return (
    <>
      <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-amber-50 border border-emerald-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-emerald-900">
              <div className="flex items-center space-x-3">
                {goal.iconType === "custom" && goal.iconUrl ? (
                  <img
                    src={goal.iconUrl}
                    alt={goal.title}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : IconComponent ? (
                  <div className="w-10 h-10 bg-emerald-900 rounded-lg flex items-center justify-center">
                    <IconComponent
                      size={24}
                      className="text-amber-100"
                      weight="fill"
                    />
                  </div>
                ) : null}
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                    {goal.title}
                  </h2>
                  {goal.description && (
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Progress
                  </span>
                  <span className="text-sm font-semibold text-emerald-900">
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                  <span>{formatCurrency(goal.currentAmount)}</span>
                  <span>{formatCurrency(goal.targetAmount)}</span>
                </div>
              </div>

              {/* Quick Submit Buttons */}
              <div>
                <QuickSubmitManager goal={goal} onUpdate={fetchGoalDetails} />
                {loading ? (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">
                      Quick Actions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-9 bg-gray-300 rounded-full w-32 animate-pulse"
                        ></div>
                      ))}
                    </div>
                  </div>
                ) : (
                  quickSubmitButtons.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">
                        Quick Actions
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {quickSubmitButtons.map((button) => (
                          <button
                            key={button.id}
                            onClick={() => handleQuickSubmit(button)}
                            className="px-4 py-2 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors text-sm font-medium"
                          >
                            {button.label} ({formatCurrency(button.amount)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Members */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Members
                </h3>
                {loading ? (
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg animate-pulse"
                      >
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <div className="h-4 bg-gray-300 rounded w-24"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg"
                      >
                        {member.userProfile.photoURL ? (
                          <img
                            src={member.userProfile.photoURL}
                            alt={member.userProfile.displayName || "Member"}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center border border-emerald-900">
                            <UserCircle
                              size={16}
                              className="text-emerald-900"
                              weight="fill"
                            />
                          </div>
                        )}
                        <span className="text-sm">
                          {member.userProfile.displayName || "Anonymous"}
                        </span>
                        {member.role === "owner" && (
                          <span className="text-xs text-gray-500">(Owner)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transaction History */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Transaction History
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loading ? (
                    <>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg animate-pulse"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-300 rounded w-20"></div>
                              <div className="h-3 bg-gray-200 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 rounded w-24"></div>
                            </div>
                          </div>
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                        </div>
                      ))}
                    </>
                  ) : transactions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No transactions yet
                    </p>
                  ) : (
                    transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {transaction.type === "deposit" ? (
                            <div className="w-8 h-8 bg-gray-100 border border-emerald-900 rounded-full flex items-center justify-center">
                              <Plus
                                size={16}
                                className="text-emerald-900"
                                weight="bold"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 border border-red-900 rounded-full flex items-center justify-center">
                              <Minus
                                size={16}
                                className="text-red-900"
                                weight="bold"
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.type === "deposit"
                                ? "Deposit"
                                : "Withdrawal"}
                            </div>
                            {transaction.description && (
                              <div className="text-xs text-gray-500">
                                {transaction.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 flex items-center space-x-1">
                              <span>{formatDate(transaction.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            transaction.type === "deposit"
                              ? "text-emerald-900"
                              : "text-red-900"
                          }`}
                        >
                          {transaction.type === "deposit" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              {isOwner && (
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setGoalToDelete(goal.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="px-4 py-2 text-white bg-red-900 uppercase text-xs font-medium hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-2"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setGoalToDelete(goal.id);
                        setShowDeleteConfirm(true);
                      }
                    }}
                  >
                    <Trash size={16} weight="regular" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setGoalToDelete(null);
        }}
        onConfirm={() => {
          if (goalToDelete) {
            onDelete(goalToDelete);
            setShowDeleteConfirm(false);
            setGoalToDelete(null);
            onClose();
          }
        }}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? This action cannot be undone and all associated data will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="danger"
      />
    </>
  );
};

export default GoalDetailsModal;
