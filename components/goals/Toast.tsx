"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "phosphor-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

const Toast = ({
  message,
  type = "success",
  duration = 3000,
  onClose,
}: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-900",
          border: "border-emerald-900",
          text: "text-amber-100",
          icon: <CheckCircle size={20} weight="fill" className="text-emerald-400" />,
        };
      case "error":
        return {
          bg: "bg-red-600",
          border: "border-red-600",
          text: "text-white",
          icon: <X size={20} weight="fill" className="text-red-200" />,
        };
      default:
        return {
          bg: "bg-gray-800",
          border: "border-gray-800",
          text: "text-white",
          icon: <CheckCircle size={20} weight="fill" className="text-gray-400" />,
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] transition-all duration-300 ${
        isVisible && !isLeaving
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 opacity-0"
      }`}
    >
      <div
        className={`${styles.bg} ${styles.border} border-2 rounded-lg shadow-lg px-4 py-3 flex items-center space-x-3 min-w-[280px] max-w-[90vw] sm:max-w-md`}
      >
        <div className="flex-shrink-0">{styles.icon}</div>
        <p className={`${styles.text} text-sm font-medium flex-1`}>{message}</p>
        <button
          onClick={handleClose}
          className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Close toast"
        >
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
