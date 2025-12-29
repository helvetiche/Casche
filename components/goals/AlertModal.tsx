"use client";

import { X, Warning, CheckCircle, Info, XCircle } from "phosphor-react";
import ModalPortal from "./ModalPortal";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
}

const AlertModal = ({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
}: AlertModalProps) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <CheckCircle size={24} className="text-emerald-600" weight="fill" />
        );
      case "error":
        return <XCircle size={24} className="text-red-600" weight="fill" />;
      case "warning":
        return <Warning size={24} className="text-amber-600" weight="fill" />;
      default:
        return <Info size={24} className="text-blue-600" weight="fill" />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case "success":
        return "bg-emerald-100";
      case "error":
        return "bg-red-100";
      case "warning":
        return "bg-amber-100";
      default:
        return "bg-blue-100";
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-amber-50 border border-emerald-900 rounded-lg max-w-md w-full shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-emerald-900">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 ${getIconBgColor()} rounded-full flex items-center justify-center`}
              >
                {getIcon()}
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
          <div className="flex items-center justify-end p-4 sm:p-6 border-t border-emerald-900">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-900 text-amber-100 rounded-lg hover:bg-emerald-800 transition-colors"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClose();
                }
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AlertModal;
