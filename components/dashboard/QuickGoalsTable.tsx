"use client";

import { useState, useRef } from "react";
import { Goal } from "@/lib/types/goals";
import { Gear, Plus, Minus, Eye, Target } from "phosphor-react";
import * as PhosphorIcons from "phosphor-react";
import DropdownPortal from "./DropdownPortal";

interface QuickGoalsTableProps {
  goals: Goal[];
  onDeposit: (goalId: string) => void;
  onWithdraw: (goalId: string) => void;
  onView: (goal: Goal) => void;
}

const QuickGoalsTable = ({
  goals,
  onDeposit,
  onWithdraw,
  onView,
}: QuickGoalsTableProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Get Phosphor icon component dynamically
  const getIconComponent = (goal: Goal) => {
    if (goal.iconType === "phosphor" && goal.iconName) {
      const IconComponent =
        (PhosphorIcons as any)[goal.iconName] || Target;
      return IconComponent;
    }
    return Target;
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleToggleMenu = (goalId: string) => {
    setOpenMenuId(openMenuId === goalId ? null : goalId);
  };

  const handleAction = (
    goalId: string,
    action: "deposit" | "withdraw" | "view",
    goal: Goal
  ) => {
    setOpenMenuId(null);
    if (action === "deposit") {
      onDeposit(goalId);
    } else if (action === "withdraw") {
      onWithdraw(goalId);
    } else if (action === "view") {
      onView(goal);
    }
  };

  if (goals.length === 0) {
    return (
      <div className="bg-amber-100 border border-emerald-900 rounded-lg p-6 text-center">
        <Target
          size={32}
          className="mx-auto text-gray-400 mb-2"
          weight="thin"
        />
        <p className="text-sm text-gray-600">No goals yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-amber-100 border border-emerald-900 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-emerald-900 bg-emerald-900/10">
              <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-900">
                GOAL
              </th>
              <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {goals.map((goal) => {
              const IconComponent = getIconComponent(goal);
              const isMenuOpen = openMenuId === goal.id;

              return (
                <tr
                  key={goal.id}
                  className="border-b border-emerald-900/30 last:border-b-0 hover:bg-amber-50 transition-colors"
                >
                  {/* Goal Column */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {goal.iconType === "custom" && goal.iconUrl ? (
                        <img
                          src={goal.iconUrl}
                          alt={goal.title}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent
                            size={20}
                            className="text-amber-100 sm:w-5 sm:h-5"
                            weight="fill"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {goal.title}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(goal.currentAmount)} /{" "}
                          {formatCurrency(goal.targetAmount)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        ref={(el) => {
                          buttonRefs.current[goal.id] = el;
                        }}
                        onClick={() => handleToggleMenu(goal.id)}
                        className="p-2 hover:bg-emerald-900/10 rounded-full transition-colors"
                        aria-label="Goal actions"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleToggleMenu(goal.id);
                          }
                        }}
                      >
                        <Gear
                          size={20}
                          className="text-emerald-900"
                          weight={isMenuOpen ? "fill" : "regular"}
                        />
                      </button>

                      {/* Dropdown Menu Portal */}
                      <DropdownPortal
                        isOpen={isMenuOpen}
                        buttonRef={buttonRefs.current[goal.id]}
                        onClose={() => setOpenMenuId(null)}
                      >
                        <div className="w-40 bg-amber-50 border border-emerald-900 rounded-lg shadow-lg">
                          <div className="py-1">
                            <button
                              onClick={() =>
                                handleAction(goal.id, "deposit", goal)
                              }
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-900 hover:text-amber-100 transition-colors flex items-center gap-2"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleAction(goal.id, "deposit", goal);
                                }
                              }}
                            >
                              <Plus size={16} weight="bold" />
                              <span>Deposit</span>
                            </button>
                            <button
                              onClick={() =>
                                handleAction(goal.id, "withdraw", goal)
                              }
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-900 hover:text-amber-100 transition-colors flex items-center gap-2"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleAction(goal.id, "withdraw", goal);
                                }
                              }}
                            >
                              <Minus size={16} weight="bold" />
                              <span>Withdraw</span>
                            </button>
                            <button
                              onClick={() =>
                                handleAction(goal.id, "view", goal)
                              }
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-emerald-900 hover:text-amber-100 transition-colors flex items-center gap-2"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleAction(goal.id, "view", goal);
                                }
                              }}
                            >
                              <Eye size={16} weight="regular" />
                              <span>View Details</span>
                            </button>
                          </div>
                        </div>
                      </DropdownPortal>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuickGoalsTable;
