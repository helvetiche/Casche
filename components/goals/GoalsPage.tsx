"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Goal, GoalTransaction, GoalMember } from "@/lib/types/goals";
import { UserProfile } from "@/lib/types/friends";
import {
  Target,
  Clock,
  Users,
  Plus,
  MagnifyingGlass,
  Funnel,
} from "phosphor-react";
import GoalCard from "./GoalCard";
import CreateGoalModal from "./CreateGoalModal";
import GoalDetailsModal from "./GoalDetailsModal";
import TransactionModal from "./TransactionModal";
import ShareGoalModal from "./ShareGoalModal";
import GoalRequests from "./GoalRequests";
import Toast from "./Toast";
import AlertModal from "./AlertModal";

type GoalsTab = "my-goals" | "shared" | "requests";

const GoalsPage = () => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<GoalsTab>("my-goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sharedGoals, setSharedGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [transactionType, setTransactionType] = useState<
    "deposit" | "withdrawal"
  >("deposit");
  const [goalMembers, setGoalMembers] = useState<
    Map<string, (GoalMember & { userProfile: UserProfile })[]>
  >(new Map());
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [filterStatus, setFilterStatus] = useState<
    "all" | "in-progress" | "completed"
  >("all");
  const [sortBy, setSortBy] = useState<
    "date" | "target-date" | "progress" | "amount"
  >("date");
  const [showFilters, setShowFilters] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      // Call getCurrentUserIdToken directly without including it in deps
      // to avoid infinite loops since it's recreated on every render
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/goals?userId=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const allGoals = data.goals || [];

        // Separate owned and shared goals
        const owned = allGoals.filter((g: Goal) => g.userId === user.uid);
        const shared = allGoals.filter((g: Goal) => g.userId !== user.uid);

        setGoals(owned);
        setSharedGoals(shared);

        // Members are already included in the response, extract them
        const membersMap = new Map();
        allGoals.forEach((goal: any) => {
          if (goal.members && Array.isArray(goal.members)) {
            membersMap.set(goal.id, goal.members);
          }
        });
        setGoalMembers(membersMap);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      fetchGoals();
    }
  }, [user?.uid, fetchGoals]);

  const handleCreateGoal = (newGoal: Goal) => {
    setGoals((prev) => [newGoal, ...prev]);
    fetchGoals();
    // Show success toast
    setToast({
      message: `Goal "${newGoal.title}" created successfully!`,
      type: "success",
    });
  };

  const handleDeposit = (goalId: string) => {
    const goal = [...goals, ...sharedGoals].find((g) => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setTransactionType("deposit");
      setShowTransactionModal(true);
    }
  };

  const handleDepositWithAmount = async (goalId: string, amount: number) => {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setAlert({
          isOpen: true,
          title: "Authentication Required",
          message: "Please sign in to continue",
          type: "error",
        });
        return;
      }

      const response = await fetch(`/api/goals/${goalId}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type: "deposit",
          amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      const data = await response.json();
      handleTransactionSuccess(data.transaction, data.goal);
    } catch (error) {
      console.error("Error creating deposit:", error);
      setAlert({
        isOpen: true,
        title: "Deposit Failed",
        message:
          error instanceof Error ? error.message : "Failed to create deposit",
        type: "error",
      });
    }
  };

  const handleWithdraw = (goalId: string) => {
    const goal = [...goals, ...sharedGoals].find((g) => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setTransactionType("withdrawal");
      setShowTransactionModal(true);
    }
  };

  const handleWithdrawWithAmount = async (goalId: string, amount: number) => {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setAlert({
          isOpen: true,
          title: "Authentication Required",
          message: "Please sign in to continue",
          type: "error",
        });
        return;
      }

      const response = await fetch(`/api/goals/${goalId}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type: "withdrawal",
          amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      const data = await response.json();
      handleTransactionSuccess(data.transaction, data.goal);
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      setAlert({
        isOpen: true,
        title: "Withdrawal Failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create withdrawal",
        type: "error",
      });
    }
  };

  const handleTransactionSuccess = (
    transaction: GoalTransaction,
    updatedGoal: Goal
  ) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
    );
    setSharedGoals((prev) =>
      prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
    );
    if (selectedGoal?.id === updatedGoal.id) {
      setSelectedGoal(updatedGoal);
    }
    fetchGoals();
  };

  const handleViewGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailsModal(true);
  };

  const handleShareGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowShareModal(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/goals?goalId=${goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
        setSharedGoals((prev) => prev.filter((g) => g.id !== goalId));
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
      setAlert({
        isOpen: true,
        title: "Delete Failed",
        message: "Failed to delete goal",
        type: "error",
      });
    }
  };

  // Filter and sort goals
  const filterAndSortGoals = (goalsList: Goal[]) => {
    let filtered = goalsList;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (goal) =>
          goal.title.toLowerCase().includes(query) ||
          goal.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus === "completed") {
      filtered = filtered.filter(
        (goal) => goal.currentAmount >= goal.targetAmount
      );
    } else if (filterStatus === "in-progress") {
      filtered = filtered.filter(
        (goal) => goal.currentAmount < goal.targetAmount
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "target-date":
          if (!a.targetDate && !b.targetDate) return 0;
          if (!a.targetDate) return 1;
          if (!b.targetDate) return -1;
          return (
            new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
          );
        case "progress":
          const progressA = (a.currentAmount / a.targetAmount) * 100;
          const progressB = (b.currentAmount / b.targetAmount) * 100;
          return progressB - progressA;
        case "amount":
          return b.targetAmount - a.targetAmount;
        case "date":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return filtered;
  };

  const filteredGoals = filterAndSortGoals(goals);
  const filteredSharedGoals = filterAndSortGoals(sharedGoals);

  const tabs = [
    {
      id: "my-goals" as GoalsTab,
      label: "My Goals",
      icon: Target,
      count: goals.length,
    },
    {
      id: "shared" as GoalsTab,
      label: "Shared Goals",
      icon: Users,
      count: sharedGoals.length,
    },
    {
      id: "requests" as GoalsTab,
      label: "Requests",
      icon: Clock,
    },
  ];

  return (
    <>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target
                size={20}
                className="text-amber-100 sm:w-6 sm:h-6"
                weight="fill"
              />
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">
              Savings Goals
            </h1>
          </div>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600">
            Track your progress and achieve your financial goals.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <nav className="flex items-center justify-around px-1 sm:px-2 py-1.5 sm:py-2 bg-amber-100 rounded-full border border-emerald-900">
            <div className="flex items-center justify-around w-full gap-0.5 sm:gap-1">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <div
                    key={tab.id}
                    className={`flex flex-row items-center justify-center p-1.5 sm:p-2 cursor-pointer transition-colors rounded-full flex-1 min-w-0 ${
                      activeTab === tab.id
                        ? "bg-emerald-900 text-amber-100"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowFilters(false);
                    }}
                    aria-label={tab.label}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveTab(tab.id);
                        setShowFilters(false);
                      }
                    }}
                  >
                    <IconComponent
                      size={14}
                      weight={activeTab === tab.id ? "fill" : "regular"}
                      className={`flex-shrink-0 ${
                        activeTab === tab.id ? "text-amber-100" : ""
                      }`}
                    />
                    <span className="ml-1 sm:ml-1.5 text-[10px] sm:text-xs truncate">
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className="ml-0.5">({tab.count})</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Search and Filter Bar - Only for My Goals and Shared Goals */}
        {(activeTab === "my-goals" || activeTab === "shared") && (
          <div className="mb-4 sm:mb-6">
            <div className="bg-amber-100 border border-emerald-900 rounded-full p-1 sm:p-4">
              {/* Search and Filter Row */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <MagnifyingGlass
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    weight="regular"
                  />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-1 sm:py-2 bg-white border border-emerald-900 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-base"
                  />
                </div>

                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-1 sm:py-2 bg-white border border-emerald-900 rounded-full hover:bg-gray-50 transition-colors text-xs sm:text-base whitespace-nowrap"
                >
                  <Funnel size={18} weight="regular" />
                  <span>Filters</span>
                </button>

                {/* Clear Filters Button */}
                {(searchQuery ||
                  filterStatus !== "all" ||
                  sortBy !== "date") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                      setSortBy("date");
                    }}
                    className="px-3 sm:px-4 py-1 sm:py-2 bg-white border border-emerald-900 rounded-full hover:bg-gray-50 transition-colors text-xs sm:text-base text-gray-600 hover:text-gray-800 whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-3 bg-amber-100 border border-emerald-900 rounded-lg p-4 space-y-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "all", label: "All" },
                      { value: "in-progress", label: "In Progress" },
                      { value: "completed", label: "Completed" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilterStatus(option.value as any)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-colors ${
                          filterStatus === option.value
                            ? "bg-emerald-900 border border-emerald-900 text-amber-100"
                            : "bg-gray-100 border border-emerald-900 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "date", label: "Date Created" },
                      { value: "target-date", label: "Target Date" },
                      { value: "progress", label: "Progress" },
                      { value: "amount", label: "Target Amount" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as any)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-colors ${
                          sortBy === option.value
                            ? "bg-emerald-900 border border-emerald-900 text-amber-100"
                            : "bg-gray-100 border border-emerald-900 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "my-goals" && (
            <>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4 lg:p-6"
                    >
                      <div className="animate-pulse space-y-3 sm:space-y-4">
                        {/* Header squares */}
                        <div className="flex gap-1 justify-end">
                          <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                          <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                          <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                        </div>

                        {/* Icon + Title + Description */}
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-300 rounded-lg flex-shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 sm:h-5 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-full"></div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-300 rounded w-16"></div>
                            <div className="h-3 bg-gray-300 rounded w-12"></div>
                          </div>
                          <div className="w-full h-2 sm:h-3 bg-gray-200 rounded-full border border-gray-300">
                            <div className="h-full bg-gray-300 rounded-full w-1/3"></div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-300 rounded w-20"></div>
                            <div className="h-3 bg-gray-300 rounded w-24"></div>
                          </div>
                        </div>

                        {/* Target Date */}
                        <div className="flex items-center space-x-2">
                          <div className="h-3 bg-gray-300 rounded w-24"></div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="flex-1 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                          <div className="w-8 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                          <div className="w-8 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3">
                          <div className="flex items-center -space-x-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full border-2 border-white"></div>
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full border-2 border-white"></div>
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full border-2 border-white"></div>
                          </div>
                          <div className="h-3 bg-gray-300 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-12">
                  <Target
                    size={48}
                    className="mx-auto text-gray-400 mb-3 sm:mb-4 sm:w-16 sm:h-16"
                    weight="thin"
                  />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1.5 sm:mb-2">
                    No goals yet
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 px-2">
                    Create your first savings goal to start tracking your
                    progress!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-emerald-900 text-amber-100 text-xs sm:text-sm rounded-full hover:bg-emerald-800 transition-colors font-medium"
                  >
                    <Plus size={16} weight="bold" className="sm:w-5 sm:h-5" />
                    <span>Create Your First Goal</span>
                  </button>
                </div>
              ) : filteredGoals.length === 0 ? (
                <div className="text-center py-12">
                  <MagnifyingGlass
                    size={48}
                    className="mx-auto text-gray-400 mb-4"
                    weight="thin"
                  />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No goals found
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Try adjusting your search or filter criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                      setSortBy("date");
                    }}
                    className="text-sm text-emerald-900 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  {filteredGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      user={user!}
                      members={goalMembers.get(goal.id) || []}
                      onDeposit={handleDeposit}
                      onWithdraw={handleWithdraw}
                      onView={handleViewGoal}
                      onShare={handleShareGoal}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "shared" && (
            <>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-amber-100 border border-emerald-900 rounded-lg p-3 sm:p-4 lg:p-6"
                    >
                      <div className="animate-pulse space-y-3 sm:space-y-4">
                        {/* Header squares */}
                        <div className="flex gap-1 justify-end">
                          <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                          <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                          <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>
                        </div>

                        {/* Icon + Title + Description */}
                        <div className="flex items-start space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-300 rounded-lg flex-shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 sm:h-5 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-300 rounded w-full"></div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-300 rounded w-16"></div>
                            <div className="h-3 bg-gray-300 rounded w-12"></div>
                          </div>
                          <div className="w-full h-2 sm:h-3 bg-gray-200 rounded-full border border-gray-300">
                            <div className="h-full bg-gray-300 rounded-full w-1/3"></div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-300 rounded w-20"></div>
                            <div className="h-3 bg-gray-300 rounded w-24"></div>
                          </div>
                        </div>

                        {/* Target Date */}
                        <div className="flex items-center space-x-2">
                          <div className="h-3 bg-gray-300 rounded w-24"></div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="flex-1 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                          <div className="flex-1 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                          <div className="w-8 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                          <div className="w-8 h-8 sm:h-9 bg-gray-300 rounded-full"></div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3">
                          <div className="flex items-center -space-x-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full border-2 border-white"></div>
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full border-2 border-white"></div>
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full border-2 border-white"></div>
                          </div>
                          <div className="h-3 bg-gray-300 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : sharedGoals.length === 0 ? (
                <div className="text-center py-12">
                  <Users
                    size={48}
                    className="mx-auto text-gray-400 mb-4"
                    weight="thin"
                  />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No shared goals
                  </h3>
                  <p className="text-sm text-gray-600">
                    Goals shared with you by friends will appear here.
                  </p>
                </div>
              ) : filteredSharedGoals.length === 0 ? (
                <div className="text-center py-12">
                  <MagnifyingGlass
                    size={48}
                    className="mx-auto text-gray-400 mb-4"
                    weight="thin"
                  />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No goals found
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Try adjusting your search or filter criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                      setSortBy("date");
                    }}
                    className="text-sm text-emerald-900 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  {filteredSharedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      user={user!}
                      members={goalMembers.get(goal.id) || []}
                      onDeposit={handleDeposit}
                      onWithdraw={handleWithdraw}
                      onView={handleViewGoal}
                      onShare={handleShareGoal}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "requests" && (
            <GoalRequests
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
            />
          )}
        </div>

        {/* Modals */}
        <CreateGoalModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateGoal}
        />

        <GoalDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedGoal(null);
          }}
          goal={selectedGoal}
          onUpdate={(updatedGoal) => {
            setGoals((prev) =>
              prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
            );
            setSharedGoals((prev) =>
              prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
            );
            fetchGoals();
          }}
          onDelete={handleDeleteGoal}
          onDeposit={handleDepositWithAmount}
          onWithdraw={handleWithdrawWithAmount}
        />

        <TransactionModal
          isOpen={showTransactionModal}
          onClose={() => {
            setShowTransactionModal(false);
            setSelectedGoal(null);
          }}
          goal={selectedGoal}
          type={transactionType}
          onSuccess={handleTransactionSuccess}
        />

        <ShareGoalModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedGoal(null);
          }}
          goal={selectedGoal}
          onShare={fetchGoals}
        />

        {/* Floating Action Button */}
        {activeTab === "my-goals" && (
          <div className="fixed bottom-20 sm:bottom-24 right-3 sm:right-4 lg:right-6 z-40">
            <button
              onClick={() => setShowCreateModal(true)}
              className="relative w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-emerald-900 rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-800 transition-colors"
              aria-label="Create new goal"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowCreateModal(true);
                }
              }}
            >
              <Target
                size={20}
                weight="duotone"
                className="text-amber-100 sm:w-6 sm:h-6"
              />
              <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-amber-50 rounded-full flex items-center justify-center shadow-md">
                <Plus
                  size={10}
                  weight="bold"
                  className="text-emerald-900 sm:w-3 sm:h-3"
                />
              </div>
            </button>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>

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

export default GoalsPage;
