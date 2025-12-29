"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownPortalProps {
  children: ReactNode;
  isOpen: boolean;
  buttonRef: HTMLElement | null;
  onClose: () => void;
}

const DropdownPortal = ({
  children,
  isOpen,
  buttonRef,
  onClose,
}: DropdownPortalProps) => {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !buttonRef || !mounted) return;

    const updatePosition = () => {
      const rect = buttonRef.getBoundingClientRect();
      // Using fixed positioning, so getBoundingClientRect() is already viewport-relative
      setPosition({
        top: rect.bottom + 8, // 8px offset below button
        right: window.innerWidth - rect.right, // Align to right edge of button
      });
    };

    updatePosition();

    // Update position on scroll or resize
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, buttonRef, mounted]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdownMenu = target.closest('[data-dropdown-menu]');
      const button = buttonRef;
      
      if (
        button &&
        !button.contains(target) &&
        !dropdownMenu
      ) {
        onClose();
      }
    };

    // Use a small delay to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, buttonRef, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      data-dropdown-menu
      className="fixed z-[100]"
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default DropdownPortal;
