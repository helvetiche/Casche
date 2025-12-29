"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  getIdTokenResult,
  getIdToken,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { getCSRFToken } from "@/lib/api-client";

interface CustomClaims {
  role: string;
  tier: string;
}

interface AuthContextType {
  user: User | null;
  customClaims: CustomClaims | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUserIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        try {
          // Get the ID token result to access custom claims
          const idTokenResult = await getIdTokenResult(user);
          const claims = idTokenResult.claims;

          // Extract custom claims
          const customClaimsData: CustomClaims = {
            role: (claims.role as string) || "user",
            tier: (claims.tier as string) || "basic",
          };

          setCustomClaims(customClaimsData);

          // Fetch CSRF token for authenticated requests
          try {
            await fetch("/api/auth/csrf-token", {
              method: "GET",
              credentials: "include",
            });
          } catch (csrfError) {
            console.warn("Failed to fetch CSRF token:", csrfError);
            // Don't block the auth flow if CSRF token fetch fails
          }
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setCustomClaims(null);
        }
      } else {
        setCustomClaims(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Set custom claims for the user
      try {
        // Get CSRF token first
        const csrfToken = await getCSRFToken();
        if (!csrfToken) {
          console.warn("Failed to get CSRF token for set-claims");
          // Don't throw here as the user is already signed in
          return;
        }

        // Get ID token for authentication
        const idToken = await getIdToken(user);
        if (!idToken) {
          console.warn("Failed to get ID token for set-claims");
          return;
        }

        await fetch("/api/auth/set-claims", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
            "X-CSRF-Token": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify({ uid: user.uid }),
        });
      } catch (claimsError) {
        console.warn("Failed to set custom claims:", claimsError);
        // Don't throw here as the user is already signed in
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCustomClaims(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const getCurrentUserIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await getIdToken(user);
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  };

  const value = {
    user,
    customClaims,
    loading,
    signInWithGoogle,
    logout,
    getCurrentUserIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
