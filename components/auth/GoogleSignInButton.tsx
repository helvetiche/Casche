"use client";

import { useAuth } from "@/context/AuthContext";
import { PaperPlaneRight } from "phosphor-react";
import { useRouter } from "next/navigation";

const GoogleSignInButton = () => {
  const { signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Redirect to dashboard after successful login
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to sign in:", error);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      className={`
        w-full max-w-sm mx-auto flex items-center justify-center gap-3 px-6 py-3
        brutal-border brutal-shadow rounded-none
        text-emerald-900 font-mono text-xs uppercase tracking-wider
      `}
      aria-label="Sign in with Google"
    >
      <span className="text-emerald-900 font-bold">
        {loading ? "Signing in..." : "Let's Go!"}
      </span>

      <PaperPlaneRight size={20} className="text-emerald-900" />
    </button>
  );
};

export default GoogleSignInButton;
