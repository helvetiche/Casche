"use client";

import { useState } from "react";
import { SavingsGoal } from "@/lib/types/savings";
import { X, Minus, Target } from "phosphor-react";

interface SavingsDeductModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  onDeduct: (goalId: string, amount: number) => void;
}

const SavingsDeductModal = ({
  isOpen,
  onClose,
  goal,
  onDeduct,
}: SavingsDeductModalProps) => {
  const [deductAmount, setDeductAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !goal) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(deductAmount);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount to deduct.");
      return;
    }

    if (amount > goal.currentAmount) {
      alert("Cannot deduct more than the current saved amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onDeduct(goal.id, amount);
      setDeductAmount("");
      onClose();
    } catch (error) {
      console.error("Error deducting amount:", error);
      alert("Failed to deduct amount. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxDeductAmount = goal.currentAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-amber-50 rounded-lg max-w-md w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Deduct Amount
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            aria-label="Close modal"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Goal Summary */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">{goal.title}</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Current Balance:</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(goal.currentAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">Target:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(goal.targetAmount)}
              </span>
            </div>
          </div>

          {/* Deduct Amount Input */}
          <div>
            <label
              htmlFor="deductAmount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Amount to Deduct
            </label>
            <div className="relative">
              <input
                type="number"
                id="deductAmount"
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                className="w-full pl-4 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-lg font-semibold"
                placeholder="0.00"
                min="0"
                max={maxDeductAmount}
                step="0.01"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Maximum: {formatCurrency(maxDeductAmount)}
            </p>
          </div>

          {/* Preview */}
          {deductAmount && parseFloat(deductAmount) > 0 && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <Minus size={16} className="text-red-600" weight="bold" />
                <span className="text-sm font-medium text-red-800">
                  Preview
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className="font-medium">
                    {formatCurrency(goal.currentAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Amount to Deduct:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(parseFloat(deductAmount) || 0)}
                  </span>
                </div>
                <div className="border-t border-red-300 pt-1 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900">New Balance:</span>
                    <span className="text-emerald-600">
                      {formatCurrency(
                        Math.max(
                          0,
                          goal.currentAmount - (parseFloat(deductAmount) || 0)
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors font-medium touch-manipulation"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 touch-manipulation"
              disabled={
                isSubmitting ||
                !deductAmount ||
                parseFloat(deductAmount) <= 0 ||
                parseFloat(deductAmount) > maxDeductAmount
              }
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deducting...</span>
                </>
              ) : (
                <>
                  <Minus size={16} weight="bold" />
                  <span>Deduct Amount</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SavingsDeductModal;
