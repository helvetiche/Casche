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

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-4">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || "User avatar"}
            className="w-16 h-16 rounded-full border-3 border-emerald-900 shadow-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-amber-100 border-3 border-emerald-900 rounded-full flex items-center justify-center shadow-lg">
            <UserIcon size={24} className="text-emerald-900" weight="bold" />
          </div>
        )}
        <div className="flex flex-col">
          <p className="text-md font-mono font-bold text-emerald-900 Capitalize">
            Hello, {user.displayName || user.email?.split("@")[0]}!
          </p>
          {customClaims && (
            <p className="text-xs font-mono text-emerald-900 capitalize">
              <span className="w-3 h-3 bg-emerald-900 inline-block mr-1 rounded-full"></span>
              {customClaims.tier} tier
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
