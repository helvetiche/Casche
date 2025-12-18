export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  category?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavingsGoalRequest {
  id: string;
  savingsGoalId: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
}

export interface SharedSavingsGoal {
  id: string;
  savingsGoal: SavingsGoal;
  ownerProfile: UserProfile;
  sharedAt: Date;
  status: "active" | "completed";
}

import { UserProfile } from "./friends";

export interface SavingsGoalWithOwner extends SavingsGoal {
  ownerProfile: UserProfile;
}

export interface SavingsGoalRequestWithProfiles extends SavingsGoalRequest {
  fromUserProfile: UserProfile;
  toUserProfile: UserProfile;
  savingsGoal: SavingsGoal;
}

// Re-export UserProfile from friends types
export type { UserProfile };
