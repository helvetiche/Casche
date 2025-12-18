"use client";

import { useState } from "react";
import { SavingsGoal } from "@/lib/types/savings";
import {
  Share,
  PencilSimple,
  Trash,
  Target,
  Calendar,
  Gear,
  Eye,
  Plus,
  DotsThreeVertical,
  Shield,
  Airplane,
  Car,
  House,
  GraduationCap,
  User,
  TrendUp,
  Heart,
  Gift,
  Folder,
} from "phosphor-react";

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  user?: any;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goalId: string) => void;
  onShare: (goal: SavingsGoal) => void;
  onView: (goal: SavingsGoal) => void;
  onViewHistory: (goal: SavingsGoal) => void;
  onDeductAmount?: (goalId: string, amount: number) => void;
  onUpdateProgress?: (goalId: string, newAmount: number) => void;
}

const SavingsGoalCard = ({
  goal,
  user,
  onEdit,
  onDelete,
  onShare,
  onView,
  onViewHistory,
  onDeductAmount,
  onUpdateProgress,
}: SavingsGoalCardProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const progressPercentage = Math.min(
    (goal.currentAmount / goal.targetAmount) * 100,
    100
  );

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
        year: "numeric",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return null;
    }
  };

  const handleUpdateProgress = async (newAmount: number) => {
    if (!onUpdateProgress) return;

    setIsUpdating(true);
    try {
      await onUpdateProgress(goal.id, newAmount);
    } finally {
      setIsUpdating(false);
    }
  };

  const remainingAmount = goal.targetAmount - goal.currentAmount;
  const isCompleted = goal.currentAmount >= goal.targetAmount;

  const getCategoryIcon = (categoryName: string) => {
    const categories = [
      { name: "Emergency Fund", Icon: Shield },
      { name: "Vacation", Icon: Airplane },
      { name: "Car", Icon: Car },
      { name: "House", Icon: House },
      { name: "Education", Icon: GraduationCap },
      { name: "Retirement", Icon: User },
      { name: "Investment", Icon: TrendUp },
      { name: "Wedding", Icon: Heart },
      { name: "Gift", Icon: Gift },
      { name: "Other", Icon: Folder },
    ];

    const category = categories.find((cat) => cat.name === categoryName);
    return category?.Icon || Folder;
  };

  return (
    <div className="bg-amber-100 rounded-lg border border-emerald-900 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {(() => {
              const IconComponent = getCategoryIcon(goal.category || "");
              return (
                <IconComponent
                  size={25}
                  className="text-amber-100 flex-shrink-0 bg-emerald-900 p-1 rounded-lg"
                  weight="bold"
                />
              );
            })()}
            <h3 className="text-base font-bold sm:text-lg font-semibold text-gray-900 truncate">
              {goal.title}
            </h3>
          </div>
          {goal.description && (
            <p className="text-justify text-xs text-black line-clamp-2">
              {goal.description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span
              className={`font-medium ${
                isCompleted ? "text-emerald-600" : "text-gray-900"
              }`}
            >
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-amber-100 border-1 border-emerald-900  rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted ? "bg-emerald-900" : "bg-emerald-900"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Target Amount */}
        <div className="flex items-center justify-center space-x-2 text-sm text-amber-100 bg-emerald-900 text-amber-100 rounded-lg p-2 sm:p-3">
          <Target size={14} weight="bold" />
          <span>Target: {formatCurrency(goal.targetAmount)}</span>
        </div>

        {/* Target Date and Category */}
        <div className="flex items-center justify-between text-xs text-black">
          <div className="flex items-center space-x-1">
            {goal.targetDate && (
              <>
                <Calendar size={12} />
                <span>{formatDate(goal.targetDate)}</span>
              </>
            )}
          </div>
          {goal.category && (
            <span className="bg-emerald-900 text-amber-100 px-2 py-1 rounded-full">
              {goal.category}
            </span>
          )}
        </div>

        {/* Quick Update (if onUpdateProgress is provided) */}
        {onUpdateProgress && !isCompleted && (
          <div className="sm:pt-4">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Add amount"
                className="flex-1 px-3 bg-white py-2 text-sm border border-emerald-900 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                min="0"
                step="0.01"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const value = parseFloat(
                      (e.target as HTMLInputElement).value
                    );
                    if (!isNaN(value) && value > 0) {
                      handleUpdateProgress(goal.currentAmount + value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
                disabled={isUpdating}
              />
              <button
                onClick={() => {
                  const input = document.querySelector(
                    `input[placeholder="Add amount"]`
                  ) as HTMLInputElement;
                  const value = parseFloat(input?.value || "0");
                  if (!isNaN(value) && value > 0) {
                    handleUpdateProgress(goal.currentAmount + value);
                    input.value = "";
                  }
                }}
                className="p-2 bg-emerald-900 text-amber-100 rounded-md hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                disabled={isUpdating}
                aria-label="Add amount to savings goal"
              >
                <Plus size={16} weight="bold" />
              </button>

              {/* Three-dot menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 bg-emerald-900 text-amber-100 border border-emerald-900 rounded-lg hover:bg-amber-200 transition-colors touch-manipulation"
                  aria-label="More options"
                  title="More options"
                >
                  <Gear size={16} weight="bold" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1">
                      <button
                        onClick={() => {
                          onView(goal);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Eye size={16} className="mr-3" weight="bold" />
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          onViewHistory(goal);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Target size={16} className="mr-3" weight="bold" />
                        View History
                      </button>
                      <button
                        onClick={() => {
                          onShare(goal);
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Share size={16} className="mr-3" weight="bold" />
                        Share Goal
                      </button>
                      <button
                        onClick={() => {
                          if (onDeductAmount) {
                            onDeductAmount(goal.id, 0); // This will trigger the deduction modal
                          }
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <Target size={16} className="mr-3" weight="bold" />
                        Deduct Amount
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this savings goal?"
                            )
                          ) {
                            onDelete(goal.id);
                          }
                          setShowMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash size={16} className="mr-3" weight="bold" />
                        Delete Goal
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Profile Section */}
        {user && (
          <div className="border-t pt-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User avatar"}
                  className="w-8 h-8 rounded-full border-2 border-emerald-900 object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-amber-50 border-2 border-emerald-900 rounded-full flex items-center justify-center">
                  <User size={14} className="text-emerald-900" weight="bold" />
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-900">
                  {user.displayName || user.email?.split("@")[0] || "You"}
                </p>
                <p className="text-xs text-amber-500">Goal Owner</p>
              </div>
            </div>
            <div className="text-xs text-amber-500">
              {formatDate(goal.createdAt)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavingsGoalCard;
