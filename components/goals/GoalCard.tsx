"use client";

import { useState } from "react";
import { Goal, GoalMember } from "@/lib/types/goals";
import { User } from "firebase/auth";
import {
  Target,
  Plus,
  Minus,
  Eye,
  Share,
  UserCircle,
  Calendar,
} from "phosphor-react";
import * as PhosphorIcons from "phosphor-react";

interface GoalCardProps {
  goal: Goal;
  user: User;
  members?: (GoalMember & { userProfile: { photoURL: string | null } })[];
  onDeposit: (goalId: string) => void;
  onWithdraw: (goalId: string) => void;
  onView: (goal: Goal) => void;
  onShare: (goal: Goal) => void;
}

const GoalCard = ({
  goal,
  user,
  members = [],
  onDeposit,
  onWithdraw,
  onView,
  onShare,
}: GoalCardProps) => {
  const progress = Math.min(
    (goal.currentAmount / goal.targetAmount) * 100,
    100
  );
  const isComplete = goal.currentAmount >= goal.targetAmount;

  // Get Phosphor icon component dynamically
  const getIconComponent = () => {
    if (goal.iconType === "phosphor" && goal.iconName) {
      const IconComponent = (PhosphorIcons as any)[goal.iconName] || Target;
      return IconComponent;
    }
    return Target;
  };

  const IconComponent = getIconComponent();

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date | undefined | any) => {
    if (!date) return null;

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
        return null;
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return null;
      }

      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting date:", error);
      return null;
    }
  };

  const formatLastUpdated = (date: Date | undefined | any) => {
    if (!date) return "Just now";

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
        return "Just now";
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "Just now";
      }

      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return formatDate(dateObj);
    } catch (error) {
      console.error("Error formatting last updated:", error);
      return "Just now";
    }
  };

  return (
    <div className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex gap-1 justify-end">
        <div className="w-4 h-4 bg-emerald-900 rounded-sm"></div>
        <div className="w-4 h-4 bg-emerald-800 rounded-sm"></div>
        <div className="w-4 h-4 bg-emerald-700 rounded-sm"></div>
      </div>

      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          {goal.iconType === "custom" && goal.iconUrl ? (
            <img
              src={goal.iconUrl}
              alt={goal.title}
              className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <IconComponent
                size={20}
                className="text-amber-100 sm:w-6 sm:h-6"
                weight="fill"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5 sm:mt-1">
                {goal.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700">
            Progress
          </span>
          <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-emerald-900">
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden border border-emerald-900">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                : "bg-gradient-to-r from-emerald-900 to-emerald-700"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-600">
          <span className="truncate mr-1">
            {formatCurrency(goal.currentAmount)}
          </span>
          <span className="truncate ml-1">
            {formatCurrency(goal.targetAmount)}
          </span>
        </div>
      </div>

      {/* Target Date */}
      {goal.targetDate && (
        <div className="flex items-center space-x-1.5 sm:space-x-2 mb-3 sm:mb-4 text-[10px] sm:text-xs text-gray-600">
          <Calendar
            size={12}
            weight="regular"
            className="sm:w-3.5 sm:h-3.5 flex-shrink-0"
          />
          <span className="truncate">
            Target: {formatDate(goal.targetDate)}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-4">
        <button
          onClick={() => onDeposit(goal.id)}
          className="flex-1 flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors text-xs sm:text-sm font-medium"
          aria-label="Add deposit"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onDeposit(goal.id);
            }
          }}
        >
          <Plus size={14} weight="bold" className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Deposit</span>
        </button>
        <button
          onClick={() => onWithdraw(goal.id)}
          className="flex-1 flex items-center justify-center gap-1 px-2 sm:px-3 py-2 bg-white text-emerald-900 border border-emerald-900 rounded-full hover:bg-amber-50 transition-colors text-xs sm:text-sm font-medium"
          aria-label="Withdraw"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onWithdraw(goal.id);
            }
          }}
        >
          <Minus size={14} weight="bold" className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Withdraw</span>
        </button>
        <button
          onClick={() => onView(goal)}
          className="p-2 sm:px-3 sm:py-2 bg-white text-gray-700 border border-emerald-900 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
          aria-label="View details"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onView(goal);
            }
          }}
        >
          <Eye size={14} weight="regular" className="sm:w-4 sm:h-4" />
        </button>
        <button
          onClick={() => onShare(goal)}
          className="p-2 sm:px-3 sm:py-2 bg-white text-gray-700 border border-emerald-900 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
          aria-label="Share goal"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onShare(goal);
            }
          }}
        >
          <Share size={14} weight="regular" className="sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Footer - Members and Last Updated */}
      <div className="flex items-center justify-between pt-3">
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          {members.length > 0 ? (
            <div className="flex items-center -space-x-1.5 sm:-space-x-2">
              {members.slice(0, 3).map((member, index) => (
                <div
                  key={member.id}
                  className="w-8 h-8 sm:w-6 sm:h-6 rounded-full border-2 border-emerald-900 overflow-hidden flex-shrink-0"
                  style={{ zIndex: members.length - index }}
                >
                  {member.userProfile.photoURL ? (
                    <img
                      src={member.userProfile.photoURL}
                      alt="Member"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                      <UserCircle
                        size={10}
                        className="text-emerald-900 sm:w-3 sm:h-3"
                        weight="fill"
                      />
                    </div>
                  )}
                </div>
              ))}
              {members.length > 3 && (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-amber-50 bg-emerald-100 flex items-center justify-center text-[10px] sm:text-xs text-emerald-900 font-medium flex-shrink-0">
                  +{members.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] sm:text-xs text-gray-500">
              No members
            </div>
          )}
        </div>
        {goal.updatedAt && (
          <div className="text-[10px] sm:text-xs text-gray-500 truncate ml-2">
            Updated {formatLastUpdated(goal.updatedAt)}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalCard;
