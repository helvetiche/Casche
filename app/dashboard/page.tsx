"use client";

import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/components/auth";
import { getCSRFToken } from "@/lib/api-client";
import BottomNavigation from "@/components/Navigation";
import FriendsPage from "@/components/friends/FriendsPage";
import GoalsPage from "@/components/goals/GoalsPage";
import WalletCard from "@/components/dashboard/WalletCard";
import QuickGoalsTable from "@/components/dashboard/QuickGoalsTable";
import Analytics from "@/components/dashboard/Analytics";
import FriendsSection from "@/components/dashboard/FriendsSection";
import TransactionModal from "@/components/goals/TransactionModal";
import GoalDetailsModal from "@/components/goals/GoalDetailsModal";
import ConfirmationModal from "@/components/goals/ConfirmationModal";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Coins, Plus, Target } from "phosphor-react";
import { Goal, GoalTransaction } from "@/lib/types/goals";

// TypewriterText component for animated labels
const TypewriterText = ({
  text,
  isVisible,
}: {
  text: string;
  isVisible: boolean;
}) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setDisplayText("");
      setCurrentIndex(0);
      return;
    }

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 10); // Speed of typewriter effect

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, isVisible]);

  if (!isVisible) return null;

  return (
    <span className="text-xs ml-2 font-medium font-mono text-amber-100">
      {displayText}
    </span>
  );
};

export default function Dashboard() {
  const { user, loading, getCurrentUserIdToken, logout } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("summary");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [transactionType, setTransactionType] = useState<
    "deposit" | "withdrawal"
  >("deposit");
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch goals to calculate total savings
  const fetchGoals = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setGoalsLoading(true);
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
        setGoals(allGoals);

        // Calculate total savings across all goals
        const total = allGoals.reduce(
          (sum: number, goal: Goal) => sum + (goal.currentAmount || 0),
          0
        );
        setTotalSavings(total);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setGoalsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Fetch goals when user is available
  useEffect(() => {
    if (user?.uid && activeSection === "summary") {
      fetchGoals();
    }
  }, [user?.uid, activeSection, fetchGoals]);

  // Handle deposit action
  const handleDeposit = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setTransactionType("deposit");
      setShowTransactionModal(true);
    }
  };

  // Handle withdraw action
  const handleWithdraw = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setTransactionType("withdrawal");
      setShowTransactionModal(true);
    }
  };

  // Handle view action
  const handleViewGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDetailsModal(true);
  };

  // Handle transaction success
  const handleTransactionSuccess = (
    transaction: GoalTransaction,
    updatedGoal: Goal
  ) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
    );

    // Recalculate total savings
    const updatedGoals = goals.map((g) =>
      g.id === updatedGoal.id ? updatedGoal : g
    );
    const total = updatedGoals.reduce(
      (sum: number, goal: Goal) => sum + (goal.currentAmount || 0),
      0
    );
    setTotalSavings(total);

    // Refresh goals to get latest data
    fetchGoals();
  };

  // Handle deposit with amount (for GoalDetailsModal)
  const handleDepositWithAmount = async (goalId: string, amount: number) => {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        alert("Authentication required");
        return;
      }

      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        alert("Failed to get security token. Please refresh the page.");
        return;
      }

      const response = await fetch(`/api/goals/${goalId}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
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
      alert(
        error instanceof Error ? error.message : "Failed to create deposit"
      );
    }
  };

  // Handle withdraw with amount (for GoalDetailsModal)
  const handleWithdrawWithAmount = async (goalId: string, amount: number) => {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        alert("Authentication required");
        return;
      }

      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        alert("Failed to get security token. Please refresh the page.");
        return;
      }

      const response = await fetch(`/api/goals/${goalId}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
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
      alert(
        error instanceof Error ? error.message : "Failed to create withdrawal"
      );
    }
  };

  // Handle delete goal
  const handleDeleteGoal = async (goalId: string) => {
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        alert("Failed to get security token. Please refresh the page.");
        return;
      }

      const response = await fetch(`/api/goals?goalId=${goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
      });

      if (response.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
        fetchGoals();
        setShowDetailsModal(false);
        setSelectedGoal(null);
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
      alert("Failed to delete goal");
    }
  };

  // Handle navigation to dedicated pages
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  // Handle logout request
  const handleLogoutRequest = () => {
    setShowLogoutConfirmation(true);
  };

  // Handle logout confirmation
  const handleLogoutConfirm = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Failed to logout:", error);
      setIsLoggingOut(false);
      setShowLogoutConfirmation(false);
    }
  };

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  const renderContent = () => {
    switch (activeSection) {
      case "summary":
        return (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Coins
                    size={20}
                    className="text-amber-100 sm:w-6 sm:h-6"
                    weight="fill"
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  Dashboard
                </h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome to your personal finance dashboard.
              </p>
            </div>

            {/* User Profile */}
            <div className="mb-6 sm:mb-8">
              <UserProfile />
            </div>

            {/* Wallet Card */}
            <div className="mb-6 sm:mb-8">
              {goalsLoading ? (
                <div className="w-full max-w-md mx-auto bg-amber-100 border border-emerald-900 rounded-2xl p-6 sm:p-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-300 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2 mt-6"></div>
                    <div className="h-10 bg-gray-300 rounded w-full"></div>
                  </div>
                </div>
              ) : (
                <WalletCard
                  cardNumber={user?.uid?.toUpperCase() || ""}
                  totalSavings={totalSavings}
                  userName={
                    user?.displayName || user?.email?.split("@")[0] || ""
                  }
                />
              )}
            </div>

            {/* Quick Goals Table */}
            <div className="mb-6 sm:mb-8">
              <div className="mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target
                      size={20}
                      className="text-amber-100 sm:w-5 sm:h-5"
                      weight="fill"
                    />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    My Savings Goals
                  </h2>
                </div>
              </div>
              {goalsLoading ? (
                <div className="bg-amber-100 border border-emerald-900 rounded-lg p-6">
                  <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-300 rounded w-32"></div>
                            <div className="h-3 bg-gray-300 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <QuickGoalsTable
                  goals={goals}
                  onDeposit={handleDeposit}
                  onWithdraw={handleWithdraw}
                  onView={handleViewGoal}
                />
              )}
            </div>

            {/* Analytics Section */}
            <div className="mb-6 sm:mb-8">
              <Analytics goals={goals} />
            </div>

            {/* Friends Section */}
            <div className="mb-6 sm:mb-8">
              <FriendsSection />
            </div>
          </div>
        );
      case "friends":
        return <FriendsPage />;
      case "goals":
        return <GoalsPage />;
      default:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-emerald-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Coins
                    size={20}
                    className="text-amber-100 sm:w-6 sm:h-6"
                    weight="fill"
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  My Summary
                </h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome to your personal finance summary.
              </p>
            </div>

            {/* User Profile */}
            <div className="mb-6 sm:mb-8">
              <UserProfile />
            </div>

            {/* Wallet Card */}
            <div className="mb-6 sm:mb-8">
              {goalsLoading ? (
                <div className="w-full max-w-md mx-auto bg-amber-100 border border-emerald-900 rounded-2xl p-6 sm:p-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-300 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2 mt-6"></div>
                    <div className="h-10 bg-gray-300 rounded w-full"></div>
                  </div>
                </div>
              ) : (
                <WalletCard
                  cardNumber={user?.uid?.toUpperCase() || ""}
                  totalSavings={totalSavings}
                  userName={
                    user?.displayName || user?.email?.split("@")[0] || ""
                  }
                />
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 grid-background pb-20">
      <main className="p-4 sm:p-6 lg:p-8">{renderContent()}</main>
      <BottomNavigation
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={handleLogoutRequest}
      />

      {/* Transaction Modal */}
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

      {/* Goal Details Modal */}
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
          fetchGoals();
        }}
        onDelete={handleDeleteGoal}
        onDeposit={handleDepositWithAmount}
        onWithdraw={handleWithdrawWithAmount}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirmation}
        onClose={() => {
          setShowLogoutConfirmation(false);
          setIsLoggingOut(false);
        }}
        onConfirm={handleLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmText="Logout"
        cancelText="Cancel"
        confirmButtonColor="danger"
        loading={isLoggingOut}
      />
    </div>
  );
}
