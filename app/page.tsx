"use client";

import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/auth";
import InstallPrompt from "@/components/InstallPrompt";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-100">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-100 px-4 py-8 relative overflow-hidden">
      {/* Neo Brutalism Grid Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Vertical Grid Lines */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-emerald-900 opacity-20"></div>
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-emerald-900 opacity-15"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-900 opacity-20"></div>
        <div className="absolute left-3/4 top-0 bottom-0 w-px bg-emerald-900 opacity-15"></div>
        <div className="absolute right-0 top-0 bottom-0 w-px bg-emerald-900 opacity-20"></div>

        {/* Horizontal Grid Lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-emerald-900 opacity-15"></div>
        <div className="absolute top-1/4 left-0 right-0 h-px bg-emerald-900 opacity-20"></div>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-900 opacity-15"></div>
        <div className="absolute top-3/4 left-0 right-0 h-px bg-emerald-900 opacity-20"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-emerald-900 opacity-15"></div>

        {/* Grid Intersection Dots */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-900 opacity-30 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute top-1/4 left-1/2 w-2 h-2 bg-emerald-900 opacity-25 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute top-1/4 left-3/4 w-2 h-2 bg-emerald-900 opacity-30 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-emerald-900 opacity-25 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-900 opacity-30 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-emerald-900 opacity-25 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute top-3/4 left-1/4 w-2 h-2 bg-emerald-900 opacity-30 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute top-3/4 left-1/2 w-2 h-2 bg-emerald-900 opacity-25 transform -translate-x-1 -translate-y-1"></div>
        <div className="absolute top-3/4 left-3/4 w-2 h-2 bg-emerald-900 opacity-30 transform -translate-x-1 -translate-y-1"></div>

        {/* Corner Accents */}
        <div className="absolute top-4 left-4 w-3 h-3 bg-emerald-900 opacity-40"></div>
        <div className="absolute top-4 right-4 w-3 h-3 bg-emerald-900 opacity-35"></div>
        <div className="absolute bottom-4 left-4 w-3 h-3 bg-emerald-900 opacity-35"></div>
        <div className="absolute bottom-4 right-4 w-3 h-3 bg-emerald-900 opacity-40"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <AuthCard />
      </div>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
}
