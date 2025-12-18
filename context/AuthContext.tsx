"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  getIdTokenResult,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

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
        await fetch("/api/auth/set-claims", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

  const value = {
    user,
    customClaims,
    loading,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
