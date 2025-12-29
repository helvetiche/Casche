"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Goal, GoalTransaction, QuickSubmitButton } from "@/lib/types/goals";
import { getCSRFToken } from "@/lib/api-client";
import { X, Plus, Minus } from "phosphor-react";
import ModalPortal from "./ModalPortal";
import AlertModal from "./AlertModal";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  type: "deposit" | "withdrawal";
  onSuccess: (transaction: GoalTransaction, updatedGoal: Goal) => void;
}

const TransactionModal = ({
  isOpen,
  onClose,
  goal,
  type,
  onSuccess,
}: TransactionModalProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickSubmitButtons, setQuickSubmitButtons] = useState<
    QuickSubmitButton[]
  >([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!goal || !amount || Number(amount) <= 0) {
      setAlert({
        isOpen: true,
        title: "Invalid Amount",
        message: "Please enter a valid amount",
        type: "error",
      });
      return;
    }

    if (type === "withdrawal" && Number(amount) > goal.currentAmount) {
      setAlert({
        isOpen: true,
        title: "Insufficient Funds",
        message:
          "You don't have enough funds in this goal to withdraw this amount.",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setAlert({
          isOpen: true,
          title: "Authentication Required",
          message: "Please sign in to continue",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        setAlert({
          isOpen: true,
          title: "Security Error",
          message: "Failed to get security token. Please refresh the page.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/goals/${goal.id}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          type,
          amount: Number(amount),
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      const data = await response.json();
      onSuccess(data.transaction, data.goal);

      // Reset form
      setAmount("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Error creating transaction:", error);
      setAlert({
        isOpen: true,
        title: "Transaction Failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create transaction",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch quick submit buttons when modal opens and goal changes
  useEffect(() => {
    const fetchQuickSubmitButtons = async () => {
      if (!goal || !isOpen || type !== "deposit") {
        setQuickSubmitButtons([]);
        return;
      }

      try {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;

        const response = await fetch(`/api/goals/${goal.id}/quick-submit`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setQuickSubmitButtons(data.buttons || []);
        }
      } catch (error) {
        console.error("Error fetching quick submit buttons:", error);
      }
    };

    fetchQuickSubmitButtons();
  }, [goal, isOpen, type, getCurrentUserIdToken]);

  const handleQuickSubmit = async (button: QuickSubmitButton) => {
    if (!goal) return;

    setAmount(button.amount.toString());
    setDescription(button.label);

    // Auto-submit the transaction
    setLoading(true);

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setAlert({
          isOpen: true,
          title: "Authentication Required",
          message: "Please sign in to continue",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        setAlert({
          isOpen: true,
          title: "Security Error",
          message: "Failed to get security token. Please refresh the page.",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/goals/${goal.id}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({
          type: "deposit",
          amount: button.amount,
          description: button.label,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      const data = await response.json();
      onSuccess(data.transaction, data.goal);

      // Reset form
      setAmount("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Error creating transaction:", error);
      setAlert({
        isOpen: true,
        title: "Transaction Failed",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create transaction",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !goal) return null;

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <>
      <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-amber-50 border border-emerald-900 rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-emerald-900">
              <div className="flex items-center space-x-2">
                {type === "deposit" ? (
                  <Plus size={24} className="text-emerald-900" weight="bold" />
                ) : (
                  <Minus size={24} className="text-red-900" weight="bold" />
                )}
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  {type === "deposit" ? "Add Deposit" : "Withdraw"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClose();
                  }
                }}
              >
                <X size={24} weight="bold" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* Goal Info */}
              <div className="p-3 bg-white border border-gray-300 rounded-lg">
                <div className="text-sm text-gray-600">Goal</div>
                <div className="text-base font-semibold text-gray-900">
                  {goal.title}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Current: {formatCurrency(goal.currentAmount)} /{" "}
                  {formatCurrency(goal.targetAmount)}
                </div>
              </div>

              {/* Quick Submit Buttons - Only for deposits */}
              {type === "deposit" && quickSubmitButtons.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Actions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {quickSubmitButtons
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map((button) => (
                        <button
                          key={button.id}
                          type="button"
                          onClick={() => handleQuickSubmit(button)}
                          disabled={loading}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {button.label} ({formatCurrency(button.amount)})
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  max={type === "withdrawal" ? goal.currentAmount : undefined}
                />
                {type === "withdrawal" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {formatCurrency(goal.currentAmount)}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Add a note about this transaction..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    type === "deposit"
                      ? "bg-emerald-900 text-amber-100 hover:bg-emerald-800"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {loading
                    ? "Processing..."
                    : type === "deposit"
                    ? "Add Deposit"
                    : "Withdraw"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

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

export default TransactionModal;
