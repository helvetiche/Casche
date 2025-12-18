"use client";

import { SavingsGoal } from "@/lib/types/savings";
import { X, Plus, Calendar } from "phosphor-react";

interface SavingsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
}

interface HistoryEntry {
  id: string;
  date: Date;
  amount: number;
  type: "initial" | "added";
}

const SavingsHistoryModal = ({
  isOpen,
  onClose,
  goal,
}: SavingsHistoryModalProps) => {
  if (!isOpen || !goal) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Mock history data - in a real app, this would come from the database
  const history: HistoryEntry[] = [
    {
      id: "1",
      date: goal.createdAt,
      amount: 0,
      type: "initial",
    },
    // Add some mock entries - in real implementation, fetch from API
    ...(goal.currentAmount > 0
      ? [
          {
            id: "2",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            amount: Math.floor(goal.currentAmount * 0.3),
            type: "added" as const,
          },
          {
            id: "3",
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            amount: Math.floor(goal.currentAmount * 0.4),
            type: "added" as const,
          },
          {
            id: "4",
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            amount: goal.currentAmount - Math.floor(goal.currentAmount * 0.7),
            type: "added" as const,
          },
        ]
      : []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalAdded = history
    .filter((entry) => entry.type === "added")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-amber-50 rounded-lg max-w-md w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
            Savings History
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            aria-label="Close modal"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Goal Summary */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">{goal.title}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Current:</span>
                <div className="font-semibold text-emerald-600">
                  {formatCurrency(goal.currentAmount)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Target:</span>
                <div className="font-semibold text-gray-900">
                  {formatCurrency(goal.targetAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* History Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <div className="text-xs text-emerald-700 font-medium uppercase tracking-wide">
                Total Added
              </div>
              <div className="text-lg font-bold text-emerald-800">
                {formatCurrency(totalAdded)}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-xs text-blue-700 font-medium uppercase tracking-wide">
                Entries
              </div>
              <div className="text-lg font-bold text-blue-800">
                {history.length}
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Transaction History
            </h4>
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      entry.type === "initial"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    {entry.type === "initial" ? (
                      <Target size={16} weight="bold" />
                    ) : (
                      <Plus size={16} weight="bold" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.type === "initial"
                          ? "Goal Created"
                          : "Amount Added"}
                      </p>
                      <p className="text-sm font-semibold text-emerald-600">
                        {entry.type === "initial"
                          ? "-"
                          : `+${formatCurrency(entry.amount)}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar size={12} className="text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {formatDate(entry.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {history.length === 1 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                No additional transactions yet. Start adding to your savings
                goal!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavingsHistoryModal;

