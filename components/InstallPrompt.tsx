"use client";

import { useState, useEffect } from "react";
import { X, Download } from "phosphor-react";

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as any);
      // Update UI to notify the user they can install the PWA
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      // Hide the install prompt
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if already installed
    if (
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // Reset the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white brutal-shadow brutal-border p-4 max-w-xs">
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-3 h-3 bg-emerald-900"></div>
          <button
            onClick={handleDismiss}
            className="text-emerald-900 hover:text-emerald-800 transition-colors"
            aria-label="Close install prompt"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="text-center">
          <h3 className="text-lg font-heading font-medium text-emerald-900 tracking-wide mb-2">
            Install Casche
          </h3>

          <p className="text-xs text-emerald-900 font-mono mb-4">
            Get the full app experience by installing Casche on your device
          </p>

          <button
            onClick={handleInstallClick}
            className="w-full bg-emerald-900 text-white border-2 border-emerald-900 px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-emerald-800 transition-colors"
          >
            Install Now
          </button>
        </div>

        {/* Bottom accent */}
        <div className="mt-3 flex justify-center">
          <div className="w-6 h-1 bg-emerald-900"></div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
