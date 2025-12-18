"use client";

import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/components/auth";
import InstallPrompt from "@/components/InstallPrompt";
import BottomNavigation from "@/components/Navigation";
import FriendsPage from "@/components/friends/FriendsPage";
import {
  SavingsGoalCard,
  CreateSavingsGoal,
  ShareSavingsGoal,
  SavingsGoalRequests,
  SharedSavingsGoals,
  SavingsGoalDetailsModal,
  SavingsHistoryModal,
  SavingsDeductModal,
} from "@/components/savings";

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
import { SavingsGoal } from "@/lib/types/savings";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Coins, Plus, Bank, Target, Clock, Users } from "phosphor-react";

export default function Dashboard() {
  const { user, loading, getCurrentUserIdToken } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("summary");

  // Savings state
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [showCreateSavingsModal, setShowCreateSavingsModal] = useState(false);
  const [showShareSavingsModal, setShowShareSavingsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [selectedSavingsGoal, setSelectedSavingsGoal] =
    useState<SavingsGoal | null>(null);
  const [activeSavingsTab, setActiveSavingsTab] = useState<
    "my-goals" | "requests" | "shared"
  >("my-goals");

  // Handle navigation to dedicated pages
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (section === "savings" && user?.uid) {
      fetchSavingsGoals();
    }
  };

  // Savings functions
  const fetchSavingsGoals = useCallback(async () => {
    try {
      setSavingsLoading(true);
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;

      const response = await fetch(`/api/savings?userId=${user!.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch savings goals");
      }

      const data = await response.json();
      setSavingsGoals(data.goals);
    } catch (err) {
      console.error("Error fetching savings goals:", err);
    } finally {
      setSavingsLoading(false);
    }
  }, [user?.uid, getCurrentUserIdToken]);

  const handleCreateSavingsGoal = (newGoal: SavingsGoal) => {
    setSavingsGoals((prev) => [newGoal, ...prev]);
  };

  const handleEditSavingsGoal = (goal: SavingsGoal) => {
    const newAmount = prompt(
      `Update current amount for "${goal.title}" (current: ₱${goal.currentAmount}):`
    );
    if (newAmount && !isNaN(Number(newAmount))) {
      handleUpdateSavingsProgress(goal.id, Number(newAmount));
    }
  };

  const handleUpdateSavingsProgress = async (
    goalId: string,
    newAmount: number
  ) => {
    if (!user?.uid) return;

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication required");

      const response = await fetch("/api/savings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          goalId,
          userId: user.uid,
          currentAmount: newAmount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update goal");
      }

      const data = await response.json();
      setSavingsGoals((prev) =>
        prev.map((goal) => (goal.id === goalId ? data.goal : goal))
      );
    } catch (error) {
      console.error("Error updating goal:", error);
      alert(error instanceof Error ? error.message : "Failed to update goal");
    }
  };

  const handleDeleteSavingsGoal = async (goalId: string) => {
    if (
      !user?.uid ||
      !confirm("Are you sure you want to delete this savings goal?")
    )
      return;

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication required");

      const response = await fetch(
        `/api/savings?goalId=${goalId}&userId=${user.uid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete goal");
      }

      setSavingsGoals((prev) => prev.filter((goal) => goal.id !== goalId));
    } catch (error) {
      console.error("Error deleting goal:", error);
      alert(error instanceof Error ? error.message : "Failed to delete goal");
    }
  };

  const handleShareSavingsGoal = (goal: SavingsGoal) => {
    setSelectedSavingsGoal(goal);
    setShowShareSavingsModal(true);
  };

  const handleViewSavingsGoal = (goal: SavingsGoal) => {
    setSelectedSavingsGoal(goal);
    setShowDetailsModal(true);
  };

  const handleViewHistory = (goal: SavingsGoal) => {
    setSelectedSavingsGoal(goal);
    setShowHistoryModal(true);
  };

  const handleDeductAmount = async (goalId: string, amount: number) => {
    if (amount === 0) {
      // This means we want to open the modal, not actually deduct
      setSelectedSavingsGoal(savingsGoals.find((g) => g.id === goalId) || null);
      setShowDeductModal(true);
      return;
    }

    // Actually deduct the amount
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const newAmount = Math.max(0, goal.currentAmount - amount);

    if (!user?.uid) return;

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication required");

      const response = await fetch("/api/savings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          goalId,
          userId: user.uid,
          currentAmount: newAmount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to deduct amount");
      }

      const data = await response.json();
      setSavingsGoals((prev) =>
        prev.map((goal) => (goal.id === goalId ? data.goal : goal))
      );

      alert(
        `Successfully deducted ₱${amount.toLocaleString()} from "${goal.title}"`
      );
    } catch (error) {
      console.error("Error deducting amount:", error);
      alert(error instanceof Error ? error.message : "Failed to deduct amount");
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
        <div className="animate-spin rounded-none h-8 w-8 border-4 border-emerald-900 border-t-transparent"></div>
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
          <div className="max-w-4xl mx-auto px-2 sm:px-0">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome to your personal finance dashboard.
              </p>
            </div>
            <UserProfile />
          </div>
        );
      case "savings":
        return (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              {/* Tabs */}
              <div className="mb-6">
                <nav className="flex items-center justify-around px-4 py-2 bg-amber-100 rounded-full border border-emerald-900">
                  <div className="flex items-center justify-around w-full">
                    {[
                      {
                        id: "my-goals" as const,
                        label: "My Goals",
                        icon: Target,
                        count: savingsGoals.length,
                      },
                      {
                        id: "requests" as const,
                        label: "Requests",
                        icon: Clock,
                      },
                      {
                        id: "shared" as const,
                        label: "Friends' Goals",
                        icon: Users,
                      },
                    ].map((tab) => {
                      const IconComponent = tab.icon;
                      return (
                        <div
                          key={tab.id}
                          className={`flex flex-row items-center p-2 cursor-pointer transition-colors rounded-full ${
                            activeSavingsTab === tab.id
                              ? "bg-emerald-900 text-amber-100"
                              : "text-gray-600 hover:text-gray-800"
                          }`}
                          onClick={() => setActiveSavingsTab(tab.id)}
                          aria-label={tab.label}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setActiveSavingsTab(tab.id);
                            }
                          }}
                        >
                          <IconComponent
                            size={16}
                            weight={
                              activeSavingsTab === tab.id ? "fill" : "regular"
                            }
                            className={
                              activeSavingsTab === tab.id
                                ? "text-amber-100"
                                : ""
                            }
                          />
                          <TypewriterText
                            text={`${tab.label}${
                              tab.count !== undefined ? ` (${tab.count})` : ""
                            }`}
                            isVisible={activeSavingsTab === tab.id}
                          />
                        </div>
                      );
                    })}
                  </div>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeSavingsTab === "my-goals" && (
                <>
                  {savingsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-amber-50 rounded-lg border border-gray-200 p-4 sm:p-6"
                        >
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : savingsGoals.length === 0 ? (
                    <div className="text-center py-12">
                      <Target
                        size={48}
                        className="mx-auto text-black mb-4"
                        weight="thin"
                      />
                      <h3 className="text-lg font-medium text-black mb-2">
                        No savings goals yet
                      </h3>
                      <p className="text-black mb-6">
                        Create your first savings goal to start tracking your
                        progress!
                      </p>
                      <button
                        onClick={() => setShowCreateSavingsModal(true)}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-900 text-amber-100 text-sm rounded-full hover:bg-emerald-700 transition-colors font-medium"
                      >
                        <Plus size={20} weight="bold" />
                        <span>Create Your First Goal</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {savingsGoals.map((goal) => (
                        <SavingsGoalCard
                          key={goal.id}
                          goal={goal}
                          user={user}
                          onEdit={handleEditSavingsGoal}
                          onDelete={handleDeleteSavingsGoal}
                          onShare={handleShareSavingsGoal}
                          onView={handleViewSavingsGoal}
                          onViewHistory={handleViewHistory}
                          onDeductAmount={handleDeductAmount}
                          onUpdateProgress={handleUpdateSavingsProgress}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeSavingsTab === "requests" && <SavingsGoalRequests />}

              {activeSavingsTab === "shared" && <SharedSavingsGoals />}
            </div>
          </div>
        );
      case "friends":
        return <FriendsPage />;
      default:
        return (
          <div className="max-w-4xl mx-auto px-2 sm:px-0">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome to your personal finance dashboard.
              </p>
            </div>
            <UserProfile />
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
      />

      {/* Floating Action Button */}
      {activeSection === "summary" && (
        <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40">
          <button
            className="relative w-12 h-12 sm:w-14 sm:h-14 bg-emerald-900 rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-800 transition-colors"
            aria-label="Add new transaction"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                // Handle add transaction action
              }
            }}
          >
            <Coins
              size={20}
              weight="duotone"
              className="text-amber-100 sm:w-6 sm:h-6"
            />

            {/* Plus badge */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-amber-50 rounded-full flex items-center justify-center shadow-md">
              <Plus
                size={12}
                weight="bold"
                className="text-emerald-900 sm:w-3.5 sm:h-3.5"
              />
            </div>
          </button>
        </div>
      )}

      {/* Savings Floating Action Button */}
      {activeSection === "savings" && (
        <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40">
          <button
            onClick={() => setShowCreateSavingsModal(true)}
            className="relative w-12 h-12 sm:w-14 sm:h-14 bg-emerald-900 rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-800 transition-colors"
            aria-label="Create new savings goal"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowCreateSavingsModal(true);
              }
            }}
          >
            <Bank
              size={20}
              weight="duotone"
              className="text-amber-100 sm:w-6 sm:h-6"
            />

            {/* Plus badge */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-amber-50 rounded-full flex items-center justify-center shadow-md">
              <Plus
                size={12}
                weight="bold"
                className="text-emerald-600 sm:w-3.5 sm:h-3.5"
              />
            </div>
          </button>
        </div>
      )}

      {/* Savings Modals */}
      <CreateSavingsGoal
        isOpen={showCreateSavingsModal}
        onClose={() => setShowCreateSavingsModal(false)}
        onCreate={handleCreateSavingsGoal}
      />

      <ShareSavingsGoal
        isOpen={showShareSavingsModal}
        onClose={() => setShowShareSavingsModal(false)}
        goal={selectedSavingsGoal}
      />

      <SavingsGoalDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        goal={selectedSavingsGoal}
      />

      <SavingsHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        goal={selectedSavingsGoal}
      />

      <SavingsDeductModal
        isOpen={showDeductModal}
        onClose={() => setShowDeductModal(false)}
        goal={selectedSavingsGoal}
        onDeduct={handleDeductAmount}
      />
    </div>
  );
}
