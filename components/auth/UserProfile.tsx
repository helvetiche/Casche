"use client";

import { useAuth } from "@/context/AuthContext";
import { SignOut, User as UserIcon } from "phosphor-react";

const UserProfile = () => {
  const { user, customClaims, logout, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  if (!user) return null;

  return <div className=""></div>;
};

export default UserProfile;
