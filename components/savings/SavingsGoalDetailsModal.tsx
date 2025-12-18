"use client";

import { SavingsGoal } from "@/lib/types/savings";
import {
  X,
  Target,
  Calendar,
  TrendUp,
  CheckCircle,
  Circle,
} from "phosphor-react";

interface SavingsGoalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
}

const SavingsGoalDetailsModal = ({
  isOpen,
  onClose,
  goal,
}: SavingsGoalDetailsModalProps) => {
  if (!isOpen || !goal) return null;

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

  const progressPercentage = Math.min(
    (goal.currentAmount / goal.targetAmount) * 100,
    100
  );
  const remainingAmount = goal.targetAmount - goal.currentAmount;
  const isCompleted = goal.currentAmount >= goal.targetAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-amber-50 rounded-lg max-w-md w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
            {goal.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            aria-label="Close modal"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Description */}
          {goal.description && (
            <div>
              <p className="text-sm text-black leading-relaxed">
                {goal.description}
              </p>
            </div>
          )}

          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Progress
              </span>
              <span
                className={`text-sm font-semibold ${
                  isCompleted ? "text-emerald-600" : "text-gray-900"
                }`}
              >
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  isCompleted ? "bg-emerald-500" : "bg-emerald-400"
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Amounts Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-emerald-600 mb-1">
                {formatCurrency(goal.currentAmount)}
              </div>
              <div className="text-xs text-amber-500 uppercase tracking-wide font-semibold">
                Saved
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div
                className={`text-2xl font-bold mb-1 ${
                  isCompleted ? "text-emerald-600" : "text-gray-900"
                }`}
              >
                {formatCurrency(remainingAmount > 0 ? remainingAmount : 0)}
              </div>
              <div className="text-xs text-amber-500 uppercase tracking-wide font-semibold">
                {isCompleted ? "Goal Met!" : "Remaining"}
              </div>
            </div>
          </div>

          {/* Target Amount */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <Target size={16} className="text-emerald-600" weight="bold" />
              <span className="text-sm font-medium text-gray-700">
                Target Amount
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(goal.targetAmount)}
            </div>
          </div>

          {/* Target Date */}
          {goal.targetDate && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar size={16} className="text-blue-600" weight="bold" />
                <span className="text-sm font-medium text-gray-700">
                  Target Date
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatDate(goal.targetDate)}
              </div>
            </div>
          )}

          {/* Category */}
          {goal.category && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendUp size={16} className="text-purple-600" weight="bold" />
                <span className="text-sm font-medium text-gray-700">
                  Category
                </span>
              </div>
              <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                {goal.category}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              {isCompleted ? (
                <CheckCircle
                  size={16}
                  className="text-emerald-600"
                  weight="bold"
                />
              ) : (
                <Circle size={16} className="text-gray-400" weight="bold" />
              )}
              <span className="text-sm font-medium text-gray-700">Status</span>
            </div>
            <div
              className={`text-lg font-semibold ${
                isCompleted ? "text-emerald-600" : "text-gray-900"
              }`}
            >
              {isCompleted ? "Goal Completed! 🎉" : "In Progress"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsGoalDetailsModal;
