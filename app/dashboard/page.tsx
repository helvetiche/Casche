"use client";

import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/components/auth";
import InstallPrompt from "@/components/InstallPrompt";
import BottomNavigation from "@/components/Navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="animate-spin rounded-none h-8 w-8 border-4 border-emerald-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-20">
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <UserProfile />
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
