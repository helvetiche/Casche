"use client";

import { X, Warning } from "phosphor-react";
import ModalPortal from "./ModalPortal";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: "danger" | "primary";
  loading?: boolean;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonColor = "primary",
  loading = false,
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-amber-50 border border-emerald-900 rounded-lg max-w-md w-full shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-emerald-900">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Warning size={24} className="text-red-600" weight="fill" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {title}
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

          {/* Content */}
          <div className="p-4 sm:p-6">
            <p className="text-sm sm:text-base text-gray-700">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 p-4 sm:p-6 border-t border-emerald-900">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClose();
                }
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                confirmButtonColor === "danger"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-emerald-900 text-amber-100 hover:bg-emerald-800"
              }`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            >
              {loading ? "Processing..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ConfirmationModal;
