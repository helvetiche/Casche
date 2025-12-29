"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { QuickSubmitButton, Goal } from "@/lib/types/goals";
import { X, Plus, Trash } from "phosphor-react";
import AlertModal from "./AlertModal";
import ConfirmationModal from "./ConfirmationModal";

interface QuickSubmitManagerProps {
  goal: Goal;
  onUpdate: () => void;
}

const QuickSubmitManager = ({ goal, onUpdate }: QuickSubmitManagerProps) => {
  const { user, getCurrentUserIdToken } = useAuth();
  const [buttons, setButtons] = useState<QuickSubmitButton[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [buttonToDelete, setButtonToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchQuickSubmitButtons();
  }, [goal.id]);

  const fetchQuickSubmitButtons = async () => {
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
        setButtons(data.quickSubmitButtons || []);
      }
    } catch (error) {
      console.error("Error fetching quick submit buttons:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label || !amount || Number(amount) <= 0) {
      setAlert({
        isOpen: true,
        title: "Invalid Input",
        message: "Please fill in all fields with valid values",
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

      const response = await fetch(`/api/goals/${goal.id}/quick-submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          id: editingId || undefined,
          label,
          amount: Number(amount),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save quick submit button");
      }

      setLabel("");
      setAmount("");
      setEditingId(null);
      setShowAddForm(false);
      fetchQuickSubmitButtons();
      onUpdate();
    } catch (error) {
      console.error("Error saving quick submit button:", error);
      setAlert({
        isOpen: true,
        title: "Failed to Save",
        message:
          error instanceof Error ? error.message : "Failed to save button",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (buttonId: string) => {
    setButtonToDelete(buttonId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!buttonToDelete) {
      setShowDeleteConfirm(false);
      setButtonToDelete(null);
      return;
    }

    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        setAlert({
          isOpen: true,
          title: "Authentication Required",
          message: "Please sign in to continue",
          type: "error",
        });
        setShowDeleteConfirm(false);
        setButtonToDelete(null);
        return;
      }

      const response = await fetch(
        `/api/goals/${goal.id}/quick-submit?buttonId=${buttonToDelete}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.ok) {
        fetchQuickSubmitButtons();
        onUpdate();
        setShowDeleteConfirm(false);
        setButtonToDelete(null);
      } else {
        throw new Error("Failed to delete button");
      }
    } catch (error) {
      console.error("Error deleting quick submit button:", error);
      setAlert({
        isOpen: true,
        title: "Delete Failed",
        message: "Failed to delete button",
        type: "error",
      });
      setShowDeleteConfirm(false);
      setButtonToDelete(null);
    }
  };

  const handleEdit = (button: QuickSubmitButton) => {
    setLabel(button.label);
    setAmount(button.amount.toString());
    setEditingId(button.id);
    setShowAddForm(true);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Quick Submit Buttons
          </h3>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showAddForm) {
                setLabel("");
                setAmount("");
                setEditingId(null);
              }
            }}
            className="flex items-center space-x-1 px-3 py-1 bg-emerald-900 text-amber-100 rounded-full hover:bg-emerald-800 transition-colors text-xs"
          >
            <Plus size={14} weight="bold" />
            <span>{showAddForm ? "Cancel" : "Add Button"}</span>
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleSave}
            className="p-3 bg-white border border-gray-300 rounded-lg space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g., Daily Allowance"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="0.00"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setLabel("");
                  setAmount("");
                  setEditingId(null);
                }}
                className="px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1 text-xs bg-emerald-900 text-amber-100 rounded hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : editingId ? "Update" : "Add"}
              </button>
            </div>
          </form>
        )}

        {buttons.length === 0 && !showAddForm ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No quick submit buttons yet. Add one to get started!
          </p>
        ) : (
          <div className="space-y-2">
            {buttons.map((button) => (
              <div
                key={button.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {button.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(button.amount)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(button)}
                    className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(button.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    aria-label="Delete"
                  >
                    <Trash size={14} weight="regular" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setButtonToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Quick Submit Button"
        message="Are you sure you want to delete this quick submit button? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="danger"
      />

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

export default QuickSubmitManager;
