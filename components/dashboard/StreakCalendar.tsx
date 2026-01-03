"use client";

import { useMemo, useState } from "react";
import { GoalTransaction } from "@/lib/types/goals";
import { CalendarBlank, CaretLeft, CaretRight } from "phosphor-react";

interface StreakCalendarProps {
  transactions: GoalTransaction[];
  type: "deposit" | "withdrawal";
}

const StreakCalendar = ({ transactions, type }: StreakCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate days for the current month
  const daysData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first and last day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Array<{
      date: Date;
      hasActivity: boolean;
      count: number;
    }> = [];

    // Create a map of dates with activity (normalize to local date string)
    const activityMap = new Map<string, number>();
    
    transactions
      .filter((tx) => tx.type === type)
      .forEach((tx) => {
        const txDate = new Date(tx.createdAt);
        // Normalize to local date (ignore timezone)
        const year = txDate.getFullYear();
        const month = txDate.getMonth();
        const day = txDate.getDate();
        const dateKey = `${year}-${month}-${day}`;
        activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
      });

    // Generate all days in the month
    for (let dayNum = 1; dayNum <= lastDay.getDate(); dayNum++) {
      const date = new Date(year, month, dayNum);
      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth();
      const dateDay = date.getDate();
      const dateKey = `${dateYear}-${dateMonth}-${dateDay}`;
      const count = activityMap.get(dateKey) || 0;
      
      days.push({
        date,
        hasActivity: count > 0,
        count,
      });
    }

    return days;
  }, [transactions, type, currentMonth]);

  // Calculate current streak (from today backwards)
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check all transactions, not just current month
    const allTransactions = transactions.filter((tx) => tx.type === type);
    const activityMap = new Map<string, boolean>();

    allTransactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      const year = txDate.getFullYear();
      const month = txDate.getMonth();
      const day = txDate.getDate();
      const dateKey = `${year}-${month}-${day}`;
      activityMap.set(dateKey, true);
    });

    // Count backwards from today
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const year = checkDate.getFullYear();
      const month = checkDate.getMonth();
      const day = checkDate.getDate();
      const dateKey = `${year}-${month}-${day}`;

      if (activityMap.get(dateKey)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [transactions, type]);

  // Calculate longest streak (from all transactions)
  const longestStreak = useMemo(() => {
    const allTransactions = transactions.filter((tx) => tx.type === type);
    if (allTransactions.length === 0) return 0;

    // Sort transactions by date
    const sortedTransactions = [...allTransactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let maxStreak = 0;
    let currentStreak = 1;
    let lastDate: Date | null = null;

    sortedTransactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      txDate.setHours(0, 0, 0, 0);

      if (lastDate) {
        const daysDiff = Math.floor(
          (txDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day
          currentStreak++;
        } else if (daysDiff > 1) {
          // Not consecutive, reset streak
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
        // If daysDiff === 0, same day, don't increment streak
      }

      lastDate = txDate;
    });

    return Math.max(maxStreak, currentStreak);
  }, [transactions, type]);

  // Get intensity level for a day (based on count)
  const getIntensity = (count: number) => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  };

  // Organize days into 8 columns grid (dynamic rows based on days in month)
  const gridData = useMemo(() => {
    if (daysData.length === 0) return [];

    // Calculate number of rows needed (8 columns per row)
    const numRows = Math.ceil(daysData.length / 8);
    
    // Organize into rows (8 columns per row)
    const rows: (typeof daysData[0])[][] = [];
    for (let i = 0; i < numRows; i++) {
      const startIdx = i * 8;
      const row = daysData.slice(startIdx, startIdx + 8);
      rows.push(row);
    }

    return rows;
  }, [daysData]);

  // Get tooltip text for a day
  const getTooltipText = (day: typeof daysData[0]) => {
    if (!day.hasActivity) {
      return `${day.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}: No ${type}s`;
    }

    return `${day.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}: ${day.count} ${type}${day.count > 1 ? "s" : ""}`;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const isWithdrawal = type === "withdrawal";
  const primaryColor = isWithdrawal ? "red" : "emerald";
  const borderColor = isWithdrawal ? "border-red-900" : "border-emerald-900";
  const bgColor = isWithdrawal ? "bg-red-900" : "bg-emerald-900";
  const textColor = isWithdrawal ? "text-red-900" : "text-emerald-900";
  const hoverBgColor = isWithdrawal ? "hover:bg-red-900" : "hover:bg-emerald-900";

  return (
    <div className={`bg-amber-100 border ${borderColor} rounded-lg p-4 sm:p-6`}>
      <div className="flex items-center space-x-2 sm:space-x-3 mb-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <CalendarBlank
            size={20}
            className="text-amber-100 sm:w-5 sm:h-5"
            weight="fill"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 capitalize">
            {type} Streak
          </h3>
          <p className="text-xs text-gray-600">
            Track your daily {type} activity
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs sm:text-sm">
        <div>
          <span className="text-gray-600">Current streak: </span>
          <span className={`font-semibold ${textColor}`}>
            {currentStreak} {currentStreak === 1 ? "day" : "days"}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Longest streak: </span>
          <span className={`font-semibold ${textColor}`}>
            {longestStreak} {longestStreak === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePreviousMonth}
          className={`p-2 rounded-lg ${hoverBgColor} hover:text-amber-100 transition-colors`}
          aria-label="Previous month"
          tabIndex={0}
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <h4 className="text-sm sm:text-base font-semibold text-gray-900">
          {monthName}
        </h4>
        <button
          onClick={handleNextMonth}
          className={`p-2 rounded-lg ${hoverBgColor} hover:text-amber-100 transition-colors`}
          aria-label="Next month"
          tabIndex={0}
        >
          <CaretRight size={20} weight="bold" />
        </button>
      </div>

      {/* Calendar Grid - 8 columns, dynamic rows */}
      <div className="w-full">
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
          {gridData.map((row, rowIndex) =>
            row.map((day, colIndex) => {
              const intensity = getIntensity(day.count);
              const intensityColors = isWithdrawal
                ? [
                    "bg-gray-200 border border-gray-300", // No activity
                    "bg-red-300 border border-red-400", // Level 1
                    "bg-red-500 border border-red-600", // Level 2
                    "bg-red-700 border border-red-800", // Level 3
                    "bg-red-900 border border-red-950", // Level 4
                  ]
                : [
                    "bg-gray-200 border border-gray-300", // No activity
                    "bg-emerald-300 border border-emerald-400", // Level 1
                    "bg-emerald-500 border border-emerald-600", // Level 2
                    "bg-emerald-700 border border-emerald-800", // Level 3
                    "bg-emerald-900 border border-emerald-950", // Level 4
                  ];

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`aspect-square rounded-sm ${intensityColors[intensity]} transition-all hover:scale-110 cursor-pointer`}
                  title={getTooltipText(day)}
                  aria-label={getTooltipText(day)}
                  tabIndex={0}
                />
              );
            })
          )}
          {/* Fill empty cells in the last row if needed */}
          {gridData.length > 0 && gridData[gridData.length - 1].length < 8 &&
            Array.from({ length: 8 - gridData[gridData.length - 1].length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="aspect-square rounded-sm bg-transparent"
              />
            ))
          }
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 text-xs sm:text-sm">
        <span className="text-gray-600">Less</span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-gray-200 border border-gray-300" />
          {isWithdrawal ? (
            <>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-red-300 border border-red-400" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-red-500 border border-red-600" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-red-700 border border-red-800" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-red-900 border border-red-950" />
            </>
          ) : (
            <>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-emerald-300 border border-emerald-400" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-emerald-500 border border-emerald-600" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-emerald-700 border border-emerald-800" />
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm bg-emerald-900 border border-emerald-950" />
            </>
          )}
        </div>
        <span className="text-gray-600">More</span>
      </div>
    </div>
  );
};

export default StreakCalendar;
